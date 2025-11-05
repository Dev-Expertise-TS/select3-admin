import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import {
  HOTEL_HASHTAG_EXTRACTION,
  getHotelHashtagSystemPrompt,
  formatHotelInfoForPrompt,
} from '@/config/ai-prompts'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const normalizeTagText = (value: string): string => value.replace(/\s+/g, '').toLowerCase()
const normalizeTagForSimilarity = (value: string): string => {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^a-z0-9가-힣]/g, '')
    .replace(/(호텔|리조트|리조트호텔|hotel|resort)$/g, '')
    .replace(/(추천|여행|trip|stay)$/g, '')
}

/**
 * 태그 우선순위를 계산하는 함수
 * 등급 관련 태그가 가장 먼저 오도록 정렬
 */
function getTagPriority(tag: string): number {
  const tagLower = tag.toLowerCase()
  
  // 1순위: 호텔 등급 (가장 중요!)
  if (tagLower.includes('최고급프리미엄') || tagLower.includes('최고급') || tagLower.includes('프리미엄최고급')) return 1
  if (tagLower.includes('럭셔리')) return 2
  if (tagLower.includes('프리미엄')) return 3
  if (tagLower.includes('가성비')) return 4
  if (tagLower.includes('이코노미')) return 5
  
  // 2순위: 위치/접근성
  if (tagLower.includes('역도보') || tagLower.includes('역직결') || tagLower.includes('중심가') || 
      tagLower.includes('해변') || tagLower.includes('공항') || tagLower.includes('인접')) return 10
  
  // 3순위: 주요 시설
  if (tagLower.includes('풀') || tagLower.includes('수영장') || tagLower.includes('스파') || 
      tagLower.includes('레스토랑') || tagLower.includes('미슐랭')) return 20
  
  // 4순위: 키즈 시설
  if (tagLower.includes('키즈') || tagLower.includes('유아') || tagLower.includes('어린이') || 
      tagLower.includes('아기') || tagLower.includes('패밀리룸') || tagLower.includes('베이비시터')) return 30
  
  // 5순위: 객실/서비스
  if (tagLower.includes('객실') || tagLower.includes('룸') || tagLower.includes('서비스') || 
      tagLower.includes('버틀러') || tagLower.includes('컨시어지')) return 40
  
  // 6순위: 분위기/여행목적
  return 50
}

const normalizeTag = (value: string): string => value.replace(/\s+/g, '').toLowerCase()

const STRICT_TAG_KEYWORDS: Record<string, string[]> = {
  인피니티풀: ['인피니티', 'infinity pool', 'infinity-edge'],
  사계절온수풀: ['온수풀', 'heated pool', 'all-season pool'],
  루프탑수영장: ['루프탑 수영장', 'rooftop pool', 'roof-top pool'],
  프라이빗해변: ['프라이빗 해변', 'private beach'],
  프라이빗풀: ['프라이빗 풀', 'private pool'],
  워터파크: ['워터파크', 'water park'],
  키즈풀별도운영: ['키즈풀', 'kids pool', 'children pool'],
  유아전용풀: ['유아 전용 풀', 'toddler pool', 'baby pool'],
  키즈클럽운영: ['키즈 클럽', 'kids club', 'children club'],
  키즈카페: ['키즈 카페', 'kids cafe', 'children cafe'],
  실내놀이터: ['실내 놀이터', 'indoor playground', 'play room', 'playroom'],
  키즈프로그램: ['키즈 프로그램', 'kids program', 'children program', 'family program'],
  베이비시터: ['베이비시터', 'babysitter', 'childcare service'],
  키즈워터파크: ['키즈 워터파크', 'kids water park'],
  키즈라운지: ['키즈 라운지', 'kids lounge'],
  키즈수영강습: ['수영 강습', 'swimming lesson'],
  키즈메뉴: ['키즈 메뉴', 'kids menu', 'children menu'],
  어린이뷔페: ['어린이 뷔페', 'kids buffet', 'children buffet'],
  이유식제공: ['이유식', 'baby food', 'infant meal'],
  유아용침대제공: ['유아 침대', 'baby crib', 'crib', 'cot'],
  아기욕조제공: ['아기 욕조', 'baby bathtub', 'infant bathtub'],
  버틀러서비스: ['버틀러', 'butler'],
  미슐랭레스토랑: ['미슐랭', 'michelin'],
  미슐랭레스토랑추천: ['미슐랭', 'michelin'],
  미슐랭스타레스토랑: ['미슐랭', 'michelin'],
  루프탑바: ['루프탑 바', 'rooftop bar'],
  올인클루시브: ['올인클루시브', 'all inclusive'],
  프라이빗체크인: ['프라이빗 체크인', 'private check-in'],
  컨시어지서비스: ['컨시어지', 'concierge'],
  발레파킹: ['발레파킹', 'valet parking'],
  스파시설: ['스파', 'spa'],
  프리미엄스파: ['스파', 'spa'],
  프리미엄스파시설: ['스파', 'spa'],
}

const requiresEvidence = (tag: string): string[] | null => {
  const normalized = normalizeTag(tag)
  for (const [key, keywords] of Object.entries(STRICT_TAG_KEYWORDS)) {
    if (normalizeTag(key) === normalized) {
      return keywords
    }
  }
  return null
}

const validateTagWithEvidence = (tag: string, hotel: any): boolean => {
  const keywords = requiresEvidence(tag)
  if (!keywords) return true

  const sources = [
    hotel.property_details_ko,
    hotel.property_details_en,
    hotel.property_details,
    hotel.property_name_ko,
    hotel.property_name_en,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (!sources) {
    console.log(`⚠️ 근거가 없어 제거된 태그 (호텔 설명 없음): ${tag}`)
    return false
  }

  const hasEvidence = keywords.some((keyword) => sources.includes(keyword.toLowerCase()))
  if (!hasEvidence) {
    console.log(`⚠️ 근거가 없어 제거된 태그: ${tag}`)
  }
  return hasEvidence
}

/**
 * 태그가 호텔 등급 태그인지 확인
 */
function isGradeTag(tag: string): boolean {
  const tagLower = tag.toLowerCase()
  return (
    tagLower.includes('최고급프리미엄') ||
    tagLower.includes('최고급') ||
    tagLower.includes('럭셔리') ||
    tagLower.includes('프리미엄') ||
    tagLower.includes('가성비') ||
    tagLower.includes('이코노미')
  )
}

/**
 * 태그 배열을 우선순위에 따라 정렬
 */
function sortTagsByPriority(tags: string[]): string[] {
  return [...tags].sort((a, b) => {
    const priorityA = getTagPriority(a)
    const priorityB = getTagPriority(b)
    
    // 우선순위가 같으면 원래 순서 유지
    if (priorityA === priorityB) return 0
    
    return priorityA - priorityB
  })
}

/**
 * 호텔 등급 태그가 없으면 기본 등급 추가
 * 등급 태그는 반드시 첫 번째에 위치
 */
function ensureGradeTag(tags: string[], hotelName: string): string[] {
  // 이미 등급 태그가 있는지 확인
  const hasGradeTag = tags.some(tag => isGradeTag(tag))
  
  if (hasGradeTag) {
    return tags
  }
  
  // 등급 태그가 없으면 호텔명으로 추론하여 추가
  const nameLower = hotelName.toLowerCase()
  let defaultGrade = '프리미엄' // 기본값
  
  // 호텔명으로 등급 추론
  if (nameLower.includes('park hyatt') || nameLower.includes('파크하얏트') ||
      nameLower.includes('four seasons') || nameLower.includes('포시즌') ||
      nameLower.includes('ritz carlton') || nameLower.includes('리츠칼튼') ||
      nameLower.includes('aman') || nameLower.includes('아만') ||
      nameLower.includes('banyan tree') || nameLower.includes('반얀트리')) {
    defaultGrade = '최고급프리미엄'
  } else if (nameLower.includes('grand hyatt') || nameLower.includes('그랜드하얏트') ||
             nameLower.includes('marriott') || nameLower.includes('메리어트') ||
             nameLower.includes('hilton') || nameLower.includes('힐튼') ||
             nameLower.includes('intercontinental') || nameLower.includes('인터컨티넨탈') ||
             nameLower.includes('sheraton') || nameLower.includes('쉐라톤') ||
             nameLower.includes('westin') || nameLower.includes('웨스틴')) {
    defaultGrade = '럭셔리'
  } else if (nameLower.includes('ibis') || nameLower.includes('이비스') ||
             nameLower.includes('best western') || nameLower.includes('베스트웨스턴')) {
    defaultGrade = '가성비'
  }
  
  console.log(`⚠️ 등급 태그 누락 감지. 기본 등급 추가: ${defaultGrade}`)
  
  // 등급 태그를 맨 앞에 추가
  return [defaultGrade, ...tags]
}

export async function POST(request: NextRequest) {
  try {
    const { sabre_id, append = false } = await request.json()

    if (!sabre_id) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID는 필수입니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // 1. 호텔 정보 조회
    const { data: hotel, error: hotelError } = await supabase
      .from('select_hotels')
      .select('*')
      .eq('sabre_id', sabre_id)
      .single()

    if (hotelError || !hotel) {
      console.error('호텔 정보 조회 오류:', hotelError)
      return NextResponse.json(
        { success: false, error: '호텔 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 2. AI를 사용하여 해시태그 추출
    const hotelDescription = formatHotelInfoForPrompt(hotel)
    const systemPrompt = getHotelHashtagSystemPrompt()

    console.log('AI 해시태그 추출 요청:', { sabre_id, append, hotelDescription })

    const completion = await openai.chat.completions.create({
      model: HOTEL_HASHTAG_EXTRACTION.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        { role: 'user', content: hotelDescription },
      ],
      temperature: HOTEL_HASHTAG_EXTRACTION.temperature,
      max_tokens: HOTEL_HASHTAG_EXTRACTION.maxTokens,
    })

    const extractedHashtagsString = completion.choices[0].message.content
    const rawTags = extractedHashtagsString
      ? extractedHashtagsString
          .split(',')
          .map((tag) => tag.trim().replace(/^#/, ''))
          .filter(Boolean)
          .filter((tag) => validateTagWithEvidence(tag, hotel))
          .filter((tag) => {
            // 잘못된 태그 필터링
            const invalidPatterns = [
              /죄송합니다/,
              /미안합니다/,
              /제공되지 않았습니다/,
              /정보가 없습니다/,
              /설명.*필요합니다/,
              /추가.*정보/,
              /^sorry/i,
              /^apolog/i,
              /not available/i,
              /no description/i,
            ]
            
            const isInvalid = invalidPatterns.some(pattern => pattern.test(tag))
            if (isInvalid) {
              console.log(`⚠️ 잘못된 태그 필터링: "${tag}"`)
            }
            return !isInvalid
          })
          .slice(0, HOTEL_HASHTAG_EXTRACTION.tagCount) // 설정된 개수만큼만 사용
      : []

    if (rawTags.length === 0) {
      console.log('⚠️ AI가 유효한 태그를 생성하지 못함. 호텔명 기반으로 기본 태그 생성')
      
      // 호텔명과 위치로 최소한의 태그 생성
      const fallbackTags: string[] = []
      
      // 도시 태그
      if (hotel.city_ko) fallbackTags.push(`${hotel.city_ko}위치`)
      else if (hotel.city_en) fallbackTags.push(`${hotel.city_en}위치`)
      
      // 국가 태그
      if (hotel.country_ko) fallbackTags.push(hotel.country_ko)
      
      // 기본 태그
      fallbackTags.push('도심호텔', '비즈니스출장')
      
      rawTags.push(...fallbackTags.slice(0, 5))
    }

    // append 모드인 경우 기존 태그와 중복되는 항목 제거
    let filteredTags = rawTags
    if (append) {
      const existingTagsSet = new Set<string>()
      const existingSimilarSet = new Set<string>()

      const { data: existingMappings, error: existingError } = await supabase
        .from('select_hotel_tags_map')
        .select('tag:select_tags(name_ko, name_en, slug)')
        .eq('sabre_id', sabre_id)

      if (existingError) {
        console.error('기존 태그 조회 오류:', existingError)
      }

      existingMappings?.forEach((mapping) => {
        const tagField = mapping.tag
        const tagInfo = Array.isArray(tagField) ? tagField[0] : tagField
        if (!tagInfo) return
        const candidates = [tagInfo.name_ko, tagInfo.name_en, tagInfo.slug]
        candidates.forEach((candidate) => {
          if (!candidate) return
          existingTagsSet.add(normalizeTagText(candidate))
          existingSimilarSet.add(normalizeTagForSimilarity(candidate))
        })
      })

      const seenNewTags = new Set<string>()
      const seenSimilar = new Set<string>()
      filteredTags = rawTags.filter((tag) => {
        const normalized = normalizeTagText(tag)
        const similar = normalizeTagForSimilarity(tag)
        const isStyleTag = /스타일|분위기|style|mood/.test(tag)
        if (!normalized) return false
        if (existingTagsSet.has(normalized)) {
          console.log(`⚠️ 기존 태그와 중복되어 건너뜀 (append 모드): ${tag}`)
          return false
        }
        if (!isStyleTag && existingSimilarSet.has(similar)) {
          console.log(`⚠️ 기존 태그와 유사하여 건너뜀 (append 모드): ${tag}`)
          return false
        }
        if (seenNewTags.has(normalized)) {
          return false
        }
        if (!isStyleTag && seenSimilar.has(similar)) {
          return false
        }
        seenNewTags.add(normalized)
        if (!isStyleTag) {
          seenSimilar.add(similar)
        }
        return true
      })

      if (filteredTags.length === 0) {
        console.log('⚠️ 새로 추가할 태그가 없어 기본 태그를 유지합니다.')
        return NextResponse.json({
          success: true,
          message: '새로 추가할 태그가 없습니다.',
          data: {
            count: 0,
            tags: [],
          },
        })
      }
    }

    // 태그를 우선순위에 따라 정렬 (등급 태그가 가장 먼저)
    let sortedTags = sortTagsByPriority(filteredTags)
    
    // 등급 태그가 없으면 자동으로 추가 (필수!)
    const hotelName = `${hotel.property_name_ko || ''} ${hotel.property_name_en || ''}`.trim()
    const extractedHashtags = ensureGradeTag(sortedTags, hotelName)

    console.log(`AI가 추출한 해시태그 (${extractedHashtags.length}개):`, extractedHashtags)
    console.log('정렬 전:', rawTags)
    console.log('정렬 후:', extractedHashtags)
    
    // 등급 태그 검증
    const gradeTag = extractedHashtags.find(tag => isGradeTag(tag))
    if (gradeTag) {
      console.log(`✅ 등급 태그 확인: ${gradeTag} (첫 번째 위치: ${extractedHashtags[0] === gradeTag})`)
    }

    // 3. 기본 카테고리 조회 또는 생성 (AI 추출용)
    let defaultCategoryId: string
    const { data: existingCategory } = await supabase
      .from('select_tag_categories')
      .select('id')
      .eq('slug', 'ai-extracted')
      .maybeSingle()

    if (existingCategory) {
      defaultCategoryId = existingCategory.id
    } else {
      // AI 추출용 기본 카테고리 생성
      const { data: newCategory, error: categoryError } = await supabase
        .from('select_tag_categories')
        .insert({
          slug: 'ai-extracted',
          name_ko: 'AI 추출',
          name_en: 'AI Extracted',
          sort_order: 999,
          is_facetable: true,
        })
        .select('id')
        .single()

      if (categoryError || !newCategory) {
        console.error('기본 카테고리 생성 오류:', categoryError)
        return NextResponse.json(
          { success: false, error: '기본 카테고리를 생성할 수 없습니다.' },
          { status: 500 }
        )
      }
      defaultCategoryId = newCategory.id
    }

    console.log('기본 카테고리 ID:', defaultCategoryId)

    // 4. 기존 호텔 태그 매핑 삭제 (append 모드가 아닌 경우)
    if (!append) {
      const { error: deleteError } = await supabase
        .from('select_hotel_tags_map')
        .delete()
        .eq('sabre_id', sabre_id)

      if (deleteError) {
        console.error('기존 호텔 태그 삭제 오류:', deleteError)
      }
    }

    // 5. 추출된 해시태그를 select_tags에 upsert하고 ID 가져오기
    const tagIdsToMap: string[] = []
    for (const tagName of extractedHashtags) {
      // 기존 태그 조회
      const { data: existingTag } = await supabase
        .from('select_tags')
        .select('id')
        .eq('name_ko', tagName)
        .maybeSingle()

      let tagId
      if (existingTag) {
        tagId = existingTag.id
      } else {
        // 새 태그 생성
        const slug = tagName
          .replace(/\s+/g, '-')
          .toLowerCase()
          .replace(/[^a-z0-9가-힣-]/g, '')

        const { data: newTag, error: newTagError } = await supabase
          .from('select_tags')
          .insert({
            name_ko: tagName,
            slug: slug || tagName,
            category_id: defaultCategoryId,
            is_active: true,
            weight: 1,
          })
          .select('id')
          .single()

        if (newTagError || !newTag) {
          console.error('태그 생성 오류:', newTagError)
          continue
        }
        tagId = newTag.id
      }
      tagIdsToMap.push(tagId)
    }

    // 6. select_hotel_tags_map에 매핑 생성
    const insertPromises = tagIdsToMap.map(async (tagId) => {
      const { error: insertMapError } = await supabase
        .from('select_hotel_tags_map')
        .insert({
          sabre_id: Number(sabre_id),
          tag_id: tagId,
        })

      if (insertMapError) {
        console.error('호텔 태그 매핑 생성 오류:', insertMapError)
      }
    })

    await Promise.all(insertPromises)

    console.log('태그 매핑 완료:', { count: tagIdsToMap.length })

    return NextResponse.json({
      success: true,
      message: '해시태그가 성공적으로 추출 및 매핑되었습니다.',
      data: {
        count: tagIdsToMap.length,
        tags: extractedHashtags,
      },
    })
  } catch (error) {
    console.error('AI 해시태그 추출 API 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'AI 해시태그 추출 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}
