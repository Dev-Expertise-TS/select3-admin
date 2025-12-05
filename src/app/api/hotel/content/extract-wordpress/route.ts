import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { sabre_id, wordpress_url } = await request.json()

    // 입력 검증
    if (!sabre_id || !wordpress_url) {
      return NextResponse.json(
        { success: false, error: 'sabre_id와 wordpress_url이 필요합니다.' },
        { status: 400 }
      )
    }

    // URL 형식 검증
    try {
      new URL(wordpress_url)
    } catch {
      return NextResponse.json(
        { success: false, error: '유효한 URL을 입력해주세요.' },
        { status: 400 }
      )
    }

    // WordPress GraphQL을 통해 본문 추출
    let extractedContent = ''
    
    try {
      // URL에서 경로 추출
      const urlObj = new URL(wordpress_url)
      const pathname = urlObj.pathname
      
      console.log('WordPress GraphQL 요청 시작')
      console.log('전체 URL:', wordpress_url)
      console.log('URL 경로:', pathname)
      
      // 1단계: 다양한 쿼리 시도 (인트로스펙션은 생략 – 공개 환경에서 차단되기 때문)
      const queries = [
        // 쿼리 1: nodeByUri (기존)
        {
          name: 'nodeByUri (Post)',
          query: `
            query ($uri: String!) {
              nodeByUri(uri: $uri) {
                ... on Post {
                  id
                  title
                  content
                  date
                }
              }
            }
          `
        },
        // 쿼리 2: nodeByUri (Page)
        {
          name: 'nodeByUri (Page)',
          query: `
            query ($uri: String!) {
              nodeByUri(uri: $uri) {
                ... on Page {
                  id
                  title
                  content
                  date
                }
              }
            }
          `
        },
        // 쿼리 3: post (URI로) - WPGraphQL 스키마에 맞게 ID! 타입 사용
        {
          name: 'post (URI)',
          query: `
            query ($id: ID!) {
              post(id: $id, idType: URI) {
                id
                title
                content
                date
              }
            }
          `,
          makeVariables: (path: string) => ({ id: path }),
        },
        // 쿼리 4: page (URI로) - WPGraphQL 스키마에 맞게 ID! 타입 사용
        {
          name: 'page (URI)',
          query: `
            query ($id: ID!) {
              page(id: $id, idType: URI) {
                id
                title
                content
                date
              }
            }
          `,
          makeVariables: (path: string) => ({ id: path }),
        },
        // 쿼리 5: posts (슬러그로)
        {
          name: 'posts (slug)',
          query: `
            query ($slug: String!) {
              posts(where: {name: $slug}) {
                nodes {
                  id
                  title
                  content
                  date
                }
              }
            }
          `,
          makeVariables: (_path: string) => ({
            slug: pathname.split('/').filter(Boolean).pop() || '',
          }),
        },
      ]

      // 각 쿼리 시도
      for (const queryInfo of queries) {
        try {
          console.log(`쿼리 시도: ${queryInfo.name}`)
          
          const res = await fetch("https://tidesquare.allstay.com/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: queryInfo.query,
              variables: queryInfo.makeVariables
                ? queryInfo.makeVariables(pathname)
                : { uri: pathname },
            }),
          })

          if (!res.ok) {
            console.log(`${queryInfo.name} 응답 실패:`, res.status, res.statusText)
            continue
          }

          const json = await res.json()
          console.log(`${queryInfo.name} 응답:`, JSON.stringify(json, null, 2))

          // GraphQL 오류 확인
          if (json.errors && json.errors.length > 0) {
            console.log(`${queryInfo.name} GraphQL 오류:`, json.errors)
            continue
          }

          // 포스트 데이터 확인 (다양한 응답 구조 지원)
          let content = null
          let title = null
          let date = null

          if (json.data?.nodeByUri?.content) {
            content = json.data.nodeByUri.content
            title = json.data.nodeByUri.title
            date = json.data.nodeByUri.date
          } else if (json.data?.post?.content) {
            content = json.data.post.content
            title = json.data.post.title
            date = json.data.post.date
          } else if (json.data?.page?.content) {
            content = json.data.page.content
            title = json.data.page.title
            date = json.data.page.date
          } else if (json.data?.posts?.nodes?.[0]?.content) {
            content = json.data.posts.nodes[0].content
            title = json.data.posts.nodes[0].title
            date = json.data.posts.nodes[0].date
          }

          if (content) {
            extractedContent = content
            console.log(`${queryInfo.name}로 본문 추출 성공!`)
            console.log('포스트 제목:', title)
            console.log('포스트 날짜:', date)
            console.log('본문 길이:', content.length)
            break
          }

        } catch (queryError) {
          console.log(`${queryInfo.name} 쿼리 실행 중 오류:`, queryError)
          continue
        }
      }

      // 모든 쿼리가 실패한 경우
      if (!extractedContent) {
        console.log('모든 GraphQL 쿼리 실패')
        
        // 3단계: HTML 파싱으로 폴백
        console.log('HTML 파싱으로 폴백 시도...')
        try {
          const htmlRes = await fetch(wordpress_url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SelectAdmin/1.0)'
            }
          })
          
          if (htmlRes.ok) {
            const html = await htmlRes.text()
            console.log('HTML 응답 길이:', html.length)
            
            // 간단한 HTML 파싱으로 본문 추출
            extractedContent = extractContentFromHtml(html)
            console.log('HTML 파싱으로 본문 추출 결과 길이:', extractedContent.length)
          }
        } catch (htmlError) {
          console.log('HTML 파싱 실패:', htmlError)
        }
      }

      if (!extractedContent) {
        return NextResponse.json(
          { success: false, error: '블로그 본문을 찾을 수 없습니다. URL을 확인해주세요.' },
          { status: 422 }
        )
      }

    } catch (fetchError) {
      console.error('WordPress GraphQL 요청 오류:', fetchError)
      return NextResponse.json(
        { success: false, error: 'WordPress GraphQL API에 접근할 수 없습니다. URL과 인터넷 연결을 확인해주세요.' },
        { status: 422 }
      )
    }

    // HTML 형식 그대로 유지하면서 정리 (태그는 제거하지 않음)
    const cleanContent = cleanHtmlContent(extractedContent)
    console.log('정리된 HTML 콘텐츠 길이:', cleanContent.length)
    console.log('정리된 HTML 콘텐츠 미리보기:', cleanContent.substring(0, 200))

    // Supabase 클라이언트 생성
    const supabase = createServiceRoleClient()

    // 먼저 해당 호텔이 존재하는지 확인
    const { data: existingHotel } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_details')
      .eq('sabre_id', sabre_id)
      .single()

    // select_hotels 테이블에 property_details upsert (HTML 형식 그대로)
    let data, error
    
    if (existingHotel) {
      // 기존 호텔이 있으면 update만 수행 (slug 문제 없음)
      const result = await supabase
        .from('select_hotels')
        .update({ property_details: cleanContent })
        .eq('sabre_id', sabre_id)
        .select('sabre_id, property_details')
        .single()
      
      data = result.data
      error = result.error
    } else {
      // 기존 호텔이 없으면 새로 생성하지 않고 에러 반환
      return NextResponse.json(
        { success: false, error: `Sabre ID ${sabre_id}에 해당하는 호텔이 존재하지 않습니다. 먼저 호텔을 생성해주세요.` },
        { status: 404 }
      )
    }

    if (error) {
      console.error('데이터베이스 저장 오류:', error)
      return NextResponse.json(
        { success: false, error: '데이터베이스 저장에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        content: cleanContent,
        sabre_id: data.sabre_id
      },
      message: 'WordPress 블로그 본문을 HTML 형식으로 성공적으로 추출하고 저장했습니다.'
    })

  } catch (error) {
    console.error('WordPress 추출 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// HTML에서 본문 내용 추출 (간단한 버전)
function extractContentFromHtml(html: string): string {
  console.log('HTML 파싱 시작')
  
  // WordPress 일반적인 본문 선택자들
  const contentSelectors = [
    'div.entry-content',
    'div.post-content',
    'div.article-content',
    'div.content-area',
    'div.main-content',
    'div.tdb_single_content',
    'div.td-post-content',
    'article',
    'main'
  ]

  // 선택자로 본문 찾기
  for (const selector of contentSelectors) {
    try {
      const regex = new RegExp(`<[^>]*class="[^"]*${selector.split('.')[1] || selector}[^"]*"[^>]*>([\\s\\S]*?)<\\/${selector.split('.')[0]}>`, 'i')
      const match = html.match(regex)
      if (match && match[1]) {
        console.log(`선택자 "${selector}"로 본문 찾음`)
        return match[1]
      }
    } catch (e) {
      console.log(`선택자 "${selector}" 처리 중 오류:`, e)
    }
  }

  // body 태그 내용 사용
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch && bodyMatch[1]) {
    console.log('body 태그로 본문 추출')
    return bodyMatch[1]
  }

  // 모든 방법이 실패한 경우 HTML 전체 사용
  console.log('모든 패턴 실패, HTML 전체 사용')
  return html
}

// HTML 콘텐츠를 정리하되 HTML 태그는 유지 (웹사이트 렌더링용)
function cleanHtmlContent(html: string): string {
  console.log('HTML 정리 시작 (태그 유지), 입력 길이:', html.length)
  
  let cleanHtml = html
  
  // 1단계: 불필요한 요소들 제거 (본문과 관련 없는 것들)
  const unwantedSelectors = [
    // 스크립트와 스타일 (보안상 제거)
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /<style[^>]*>[\s\S]*?<\/style>/gi,
    /<link[^>]*rel="stylesheet"[^>]*>/gi,
    
    // 네비게이션과 메뉴 (본문과 관련 없는 것들)
    /<nav[^>]*>[\s\S]*?<\/nav>/gi,
    /<header[^>]*>[\s\S]*?<\/header>/gi,
    /<footer[^>]*>[\s\S]*?<\/footer>/gi,
    /<aside[^>]*>[\s\S]*?<\/aside>/gi,
    /<sidebar[^>]*>[\s\S]*?<\/sidebar>/gi,
    /<menu[^>]*>[\s\S]*?<\/menu>/gi,
    
    // 폼 요소들
    /<form[^>]*>[\s\S]*?<\/form>/gi,
    /<input[^>]*>/gi,
    /<button[^>]*>[\s\S]*?<\/button>/gi,
    /<select[^>]*>[\s\S]*?<\/select>/gi,
    /<textarea[^>]*>[\s\S]*?<\/textarea>/gi,
    /<label[^>]*>[\s\S]*?<\/label>/gi,
    
    // TOC 관련 요소들
    /<div[^>]*class="[^"]*(?:toc|table-of-contents|navigation|breadcrumb|sidebar|widget|menu)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    /<div[^>]*id="[^"]*(?:toc|table-of-contents|navigation|breadcrumb|sidebar|widget|menu)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    
    // 광고 및 불필요한 위젯
    /<div[^>]*class="[^"]*(?:ad|advertisement|widget|social|share|like|follow)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    /<div[^>]*id="[^"]*(?:ad|advertisement|widget|social|share|like|follow)[^"]*"[^>]*>[\s\S]*?<\/div>/gi
  ]

  // 불필요한 요소들 제거
  for (const selector of unwantedSelectors) {
    cleanHtml = cleanHtml.replace(selector, '')
  }

  // 2단계: HTML 엔티티 디코딩 (일부만)
  cleanHtml = cleanHtml
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&hellip;/g, '...')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')

  // 3단계: 연속된 빈 줄 정리 (HTML 태그는 유지)
  cleanHtml = cleanHtml
    .replace(/\n\s*\n/g, '\n') // 연속된 빈 줄을 하나로
    .replace(/\n{3,}/g, '\n\n') // 3개 이상의 연속된 줄바꿈을 2개로
    .trim()

  console.log('HTML 정리 완료 (태그 유지), 출력 길이:', cleanHtml.length)
  return cleanHtml
}

