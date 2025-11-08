import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface GenerateSeoRequest {
  title_ko: string
  slug: string
  where_countries?: string[]
  where_cities?: string[]
  companions?: string[]
  styles?: string[]
  intro_rich_ko?: string
}

interface GenerateSeoResponse {
  success: boolean
  data?: {
    seo_title_ko: string
    seo_description_ko: string
    og_title: string
    og_description: string
    twitter_title: string
    twitter_description: string
    seo_schema_json: any
  }
  error?: string
}

const SYSTEM_PROMPT = `당신은 호텔 토픽 페이지의 SEO 최적화 전문가입니다.
주어진 토픽 페이지 정보를 바탕으로 검색 엔진과 소셜 미디어에 최적화된 메타데이터를 생성하세요.

다음 정보를 JSON 형식으로 반환하세요:
- seo_title_ko: 검색 결과에 최적화된 제목 (50-60자, 핵심 키워드 포함)
- seo_description_ko: 검색 결과 설명 (150-160자, 클릭을 유도하는 내용)
- og_title: SNS 공유용 제목 (간결하고 매력적인 제목)
- og_description: SNS 공유용 설명 (2-3문장, 감성적이고 매력적인 내용)
- twitter_title: 트위터용 제목 (og_title과 유사하지만 더 짧고 간결하게)
- twitter_description: 트위터용 설명 (og_description과 유사하지만 더 짧게)
- seo_schema_json: Schema.org의 CollectionPage 또는 TravelAction 형식의 JSON-LD

SEO 모범 사례:
1. 제목에는 핵심 키워드를 앞쪽에 배치
2. 설명에는 사용자 의도에 맞는 행동 유도 문구 포함
3. 자연스러운 한국어 사용, 키워드 나열 지양
4. 고유하고 매력적인 내용으로 작성

반드시 유효한 JSON만 반환하세요. 마크다운 코드 블록이나 추가 설명 없이.`

/**
 * 마크다운 코드 블록 제거 (```json ... ``` 형식)
 */
function cleanJsonMarkdown(content: string): string {
  let cleaned = content.trim()

  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```json?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim()
  }

  return cleaned
}

/**
 * POST /api/topic-pages/generate-seo
 * AI를 사용하여 SEO 메타데이터 자동 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateSeoRequest = await request.json()

    // 필수 필드 검증
    if (!body.title_ko || !body.slug) {
      return NextResponse.json<GenerateSeoResponse>(
        { success: false, error: 'title_ko와 slug는 필수입니다.' },
        { status: 400 }
      )
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY

    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY가 설정되지 않았습니다')
      return NextResponse.json<GenerateSeoResponse>(
        { success: false, error: 'OpenAI API 키가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    // 사용자 프롬프트 구성
    const userPrompt = `
토픽 페이지 정보:
- 제목: ${body.title_ko}
- Slug: ${body.slug}
${body.where_countries?.length ? `- 국가: ${body.where_countries.join(', ')}` : ''}
${body.where_cities?.length ? `- 도시: ${body.where_cities.join(', ')}` : ''}
${body.companions?.length ? `- 동행인: ${body.companions.join(', ')}` : ''}
${body.styles?.length ? `- 스타일: ${body.styles.join(', ')}` : ''}
${body.intro_rich_ko ? `- 소개글: ${body.intro_rich_ko.substring(0, 200)}...` : ''}

이 정보를 바탕으로 SEO에 최적화된 메타데이터를 생성해주세요.
`.trim()

    // OpenAI API 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ OpenAI API 오류:', response.status, errorText)
      return NextResponse.json<GenerateSeoResponse>(
        { success: false, error: 'AI 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      console.error('❌ OpenAI 응답에 content가 없습니다')
      return NextResponse.json<GenerateSeoResponse>(
        { success: false, error: 'AI 응답을 받을 수 없습니다.' },
        { status: 500 }
      )
    }

    // JSON 파싱 (마크다운 코드 블록 제거)
    const jsonContent = cleanJsonMarkdown(content)
    const result = JSON.parse(jsonContent)

    return NextResponse.json<GenerateSeoResponse>({
      success: true,
      data: {
        seo_title_ko: result.seo_title_ko || '',
        seo_description_ko: result.seo_description_ko || '',
        og_title: result.og_title || result.seo_title_ko || '',
        og_description: result.og_description || result.seo_description_ko || '',
        twitter_title: result.twitter_title || result.og_title || result.seo_title_ko || '',
        twitter_description: result.twitter_description || result.og_description || result.seo_description_ko || '',
        seo_schema_json: result.seo_schema_json || null,
      },
    })
  } catch (error) {
    console.error('❌ SEO 생성 중 예외 발생:', error)
    return NextResponse.json<GenerateSeoResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

