import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * 한글 태그명을 영문 slug로 변환
 */
const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function koreanToEnglishSlug(korean: string): string {
  // 기본 매핑 테이블
  const mappings: Record<string, string> = {
    // 호텔 등급
    최고급프리미엄: 'ultra-premium',
    럭셔리: 'luxury',
    프리미엄: 'premium',
    가성비: 'value',
    이코노미: 'economy',
    '5성급': 'five-star',
    '4성급': 'four-star',
    '3성급': 'three-star',
    
    // 위치
    도심: 'downtown',
    해변: 'beach',
    바다: 'ocean',
    산: 'mountain',
    공항: 'airport',
    역: 'station',
    중심가: 'center',
    인접: 'near',
    도보: 'walk',
    
    // 수영장
    수영장: 'pool',
    인피니티풀: 'infinity-pool',
    사계절온수풀: 'year-round-heated-pool',
    루프탑수영장: 'rooftop-pool',
    실내수영장: 'indoor-pool',
    야외수영장: 'outdoor-pool',
    온수풀: 'heated-pool',
    프라이빗풀: 'private-pool',
    프라이빗인피니티풀: 'private-infinity-pool',
    키즈풀: 'kids-pool',
    유아전용풀: 'toddler-pool',
    
    // 키즈
    키즈클럽: 'kids-club',
    키즈카페: 'kids-cafe',
    놀이터: 'playground',
    실내놀이터: 'indoor-playground',
    키즈메뉴: 'kids-menu',
    베이비시터: 'babysitter',
    유아침대: 'baby-crib',
    
    // 스파/웰니스
    스파: 'spa',
    프리미엄스파: 'premium-spa',
    사우나: 'sauna',
    찜질방: 'jimjilbang',
    피트니스: 'fitness',
    요가: 'yoga',
    마사지: 'massage',
    
    // 식음료
    레스토랑: 'restaurant',
    미슐랭레스토랑: 'michelin-restaurant',
    루프탑바: 'rooftop-bar',
    조식: 'breakfast',
    뷔페: 'buffet',
    룸서비스: 'room-service',
    
    // 객실
    객실: 'room',
    스위트: 'suite',
    빌라: 'villa',
    패밀리룸: 'family-room',
    킹사이즈침대: 'king-bed',
    오션뷰: 'ocean-view',
    발코니: 'balcony',
    테라스: 'terrace',
    모던미니멀디자인: 'modern-minimal-design',
    모던트로피컬디자인: 'modern-tropical-design',
    
    // 서비스
    버틀러: 'butler',
    컨시어지: 'concierge',
    발레파킹: 'valet-parking',
    프라이빗체크인: 'private-check-in',
    체크인: 'check-in',
    픽업: 'pickup-service',
    룸서비스: 'room-service',
    프라이빗컨시어지: 'private-concierge',
    컨시어지서비스: 'concierge-service',
    '24시간컨시어지': '24-hour-concierge',
    
    // 비즈니스
    비즈니스센터: 'business-center',
    연회장: 'banquet',
    미팅룸: 'meeting-room',
    와이파이: 'wifi',
    고속무선와이파이: 'high-speed-wifi',
    무선인터넷: 'wireless-internet',
    
    // 여행 목적
    신혼여행: 'honeymoon',
    가족여행: 'family-trip',
    비즈니스출장: 'business-trip',
    워케이션: 'workcation',
    커플: 'couple',
    
    // 분위기
    모던: 'modern',
    클래식: 'classic',
    힐링: 'healing',
    로맨틱: 'romantic',
    감성: 'sensibility',
  }
  
  // 매핑 테이블에서 찾기
  for (const [kor, eng] of Object.entries(mappings)) {
    if (korean.includes(kor)) {
      return eng
    }
  }
  
  return ''
}

/**
 * 규칙 기반 카테고리 매핑
 */
const CATEGORY_RULES: Record<string, string[]> = {
  'hotel-grade': [
    '최고급프리미엄', '럭셔리', '프리미엄', '가성비', '이코노미',
    '5성급', '4성급', '3성급', '특급', '고급', '중급',
    'ultra premium', 'luxury', 'premium', 'value', 'economy', 'five-star', 'four-star', 'three-star',
  ],
  'location': [
    '도심', '해변', '공항', '역', '중심가', '인접', '도보', '위치',
    '오션뷰', '시티뷰', '마운틴뷰', '바다뷰',
    'downtown', 'beach', 'airport', 'station', 'center', 'near', 'walk', 'ocean view', 'city view', 'mountain view',
  ],
  'pool': [
    '수영장', '풀', '인피니티', '루프탑수영장', '온수풀', '사계절',
    '키즈풀', '유아전용풀', '워터파크',
    'pool', 'infinity', 'rooftop pool', 'heated pool', 'kids pool', 'toddler pool', 'water park',
  ],
  'kids': [
    '키즈', '유아', '어린이', '아기', '가족여행', '패밀리',
    '베이비시터', '놀이터', '키즈클럽', '키즈카페',
    'kids', 'family', 'babysitter', 'playground', 'kids club', 'kids cafe',
  ],
  'spa-wellness': [
    '스파', '사우나', '찜질방', '마사지', '피트니스', '요가', '웰니스',
    'spa', 'sauna', 'massage', 'fitness', 'yoga', 'wellness',
  ],
  'dining': [
    '레스토랑', '미슐랭', '바', '카페', '조식', '뷔페', '룸서비스',
    'restaurant', 'michelin', 'bar', 'cafe', 'breakfast', 'buffet', 'room service', 'dining',
  ],
  'room': [
    '객실', '룸', '스위트', '빌라', '침대', '발코니', '테라스',
    'room', 'suite', 'villa', 'bed', 'balcony', 'terrace',
  ],
  'service': [
    '버틀러', '컨시어지', '발레파킹', '픽업', '서비스', '체크인',
    'butler', 'concierge', 'valet', 'pickup', 'service', 'check-in', 'private', '24-hour',
  ],
  'business': [
    '비즈니스', '연회장', '미팅룸', '회의', '와이파이',
    'business', 'conference', 'meeting', 'wifi', 'business center',
  ],
  'travel-purpose': [
    '신혼여행', '출장', '워케이션', '커플', '여행',
    'honeymoon', 'business trip', 'workcation', 'couple', 'trip',
  ],
  'atmosphere': [
    '모던', '클래식', '힐링', '로맨틱', '감성', '분위기',
    'modern', 'classic', 'healing', 'romantic', 'mood', 'atmosphere',
  ],
}

/**
 * 규칙 기반으로 카테고리 추론
 */
function inferCategoryByRules(tagName: string): string | null {
  for (const [categorySlug, keywords] of Object.entries(CATEGORY_RULES)) {
    if (keywords.some((keyword) => tagName.includes(keyword))) {
      return categorySlug
    }
  }
  return null
}

/**
 * 필요한 카테고리가 없으면 생성
 */
async function ensureCategory(supabase: any, slug: string, nameKo: string, nameEn: string): Promise<string | null> {
  // 기존 카테고리 조회
  const { data: existing } = await supabase
    .from('select_tag_categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  
  if (existing) {
    return existing.id
  }
  
  // 카테고리 생성
  const { data: newCategory, error } = await supabase
    .from('select_tag_categories')
    .insert({
      slug,
      name_ko: nameKo,
      name_en: nameEn,
      sort_order: 100,
      is_facetable: true,
    })
    .select('id')
    .single()
  
  if (error) {
    console.error(`카테고리 생성 오류 (${slug}):`, error)
    return null
  }
  
  console.log(`✅ 카테고리 생성: ${nameKo} (${slug})`)
  return newCategory.id
}

/**
 * AI를 사용하여 카테고리 추론 (규칙 기반으로 실패한 경우에만)
 */
async function inferCategoryWithAI(tagName: string, categories: any[]): Promise<string | null> {
  try {
    const categoryList = categories
      .filter((cat) => cat.slug !== 'ai-extracted') // AI 추출 카테고리 제외
      .map((cat) => `- ${cat.name_ko} (${cat.slug})`)
      .join('\n')
    
    const prompt = `다음 해시태그를 가장 적합한 카테고리에 분류해주세요.

해시태그: "${tagName}"

사용 가능한 카테고리:
${categoryList}

응답 형식: 카테고리의 slug만 작성해주세요 (예: "hotel-grade", "location", "pool")
만약 적합한 카테고리가 없다면 다음 중 하나를 제안하세요:
- "hotel-grade": 호텔 등급 관련
- "location": 위치 관련
- "pool": 수영장 관련
- "kids": 키즈 시설 관련
- "spa-wellness": 스파/웰니스 관련
- "dining": 식음료 관련
- "room": 객실 관련
- "service": 서비스 관련
- "business": 비즈니스 관련
- "travel-purpose": 여행 목적 관련
- "atmosphere": 분위기 관련`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 호텔 해시태그를 적절한 카테고리로 분류하는 전문가입니다.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 50,
    })
    
    const suggestedSlug = completion.choices[0].message.content?.trim() || null
    
    // 제안된 slug로 카테고리 찾기
    const category = categories.find((cat) => cat.slug === suggestedSlug)
    return category?.id || null
  } catch (error) {
    console.error('AI 카테고리 추론 오류:', error)
    return null
  }
}

/**
 * 카테고리 이름 매핑
 */
const CATEGORY_NAMES: Record<string, { ko: string; en: string }> = {
  'hotel-grade': { ko: '호텔 등급', en: 'Hotel Grade' },
  'location': { ko: '위치', en: 'Location' },
  'pool': { ko: '수영장', en: 'Pool' },
  'kids': { ko: '키즈 시설', en: 'Kids Facilities' },
  'spa-wellness': { ko: '스파/웰니스', en: 'Spa & Wellness' },
  'dining': { ko: '식음료', en: 'Dining' },
  'room': { ko: '객실', en: 'Room' },
  'service': { ko: '서비스', en: 'Service' },
  'business': { ko: '비즈니스', en: 'Business' },
  'travel-purpose': { ko: '여행 목적', en: 'Travel Purpose' },
  'atmosphere': { ko: '분위기', en: 'Atmosphere' },
}

/**
 * POST /api/hashtags/cleanup
 * 모든 태그의 slug를 영문으로 변환하고, 카테고리를 재배치
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    
    // 1. 모든 태그 조회
    const { data: tags, error: tagsError } = await supabase
      .from('select_tags')
      .select('*')
    
    if (tagsError) {
      console.error('태그 조회 오류:', tagsError)
      return NextResponse.json(
        { success: false, error: '태그를 조회할 수 없습니다.' },
        { status: 500 }
      )
    }
    
    // 2. 모든 카테고리 조회
    const { data: categories, error: categoriesError } = await supabase
      .from('select_tag_categories')
      .select('*')
    
    if (categoriesError) {
      console.error('카테고리 조회 오류:', categoriesError)
      return NextResponse.json(
        { success: false, error: '카테고리를 조회할 수 없습니다.' },
        { status: 500 }
      )
    }
    
    // AI 추출 카테고리 ID 찾기
    const aiExtractedCategory = categories?.find((cat) => cat.slug === 'ai-extracted')
    
    // Slug 사용 현황 초기화
    const slugUsage = new Map<string, number>()
    for (const tag of tags || []) {
      if (tag.slug) {
        const normalized = tag.slug.toLowerCase()
        slugUsage.set(normalized, (slugUsage.get(normalized) ?? 0) + 1)
      }
    }

    const reserveSlug = (base: string, currentSlug?: string): string => {
      let slug = base
      if (!slug) slug = currentSlug || ''
      slug = slugify(slug)

      if (!slug) {
        slug = currentSlug ? slugify(currentSlug) : ''
      }

      if (!slug) {
        slug = 'tag'
      }

      // 현재 슬러그 사용량 감소 (업데이트 시)
      if (currentSlug) {
        const normalizedCurrent = currentSlug.toLowerCase()
        const count = slugUsage.get(normalizedCurrent)
        if (count) {
          const nextCount = count - 1
          if (nextCount <= 0) {
            slugUsage.delete(normalizedCurrent)
          } else {
            slugUsage.set(normalizedCurrent, nextCount)
          }
        }
      }

      let candidate = slug
      let counter = 1
      while ((slugUsage.get(candidate) ?? 0) > 0) {
        candidate = `${slug}-${counter++}`
      }
      slugUsage.set(candidate, 1)

      return candidate
    }
    
    let updatedCount = 0
    let createdCategories = 0
    
    // 3. 각 태그 처리
    for (const tag of tags || []) {
      const updates: Record<string, unknown> = {}
      let needsUpdate = false
      
      // Slug 정리 (한글이 포함된 경우)
      if (true) {
        const baseSlugFromKo = tag.name_ko ? koreanToEnglishSlug(tag.name_ko) : ''
        const baseSlugFromEn = tag.name_en ? slugify(tag.name_en) : ''
        const baseSlugFromSlug = tag.slug ? slugify(tag.slug) : ''

        let chosenSlug = baseSlugFromKo

        if (!chosenSlug) {
          chosenSlug = baseSlugFromEn || baseSlugFromSlug
        }

        if (!chosenSlug || /[가-힣]/.test(chosenSlug)) {
          chosenSlug = baseSlugFromEn || baseSlugFromSlug
        }

        if (!chosenSlug) {
          chosenSlug = `tag-${(tag.id || '').slice(0, 6)}`
        }

        const uniqueSlug = reserveSlug(chosenSlug, tag.slug)

        if (uniqueSlug && uniqueSlug !== tag.slug) {
          updates.slug = uniqueSlug
          needsUpdate = true
          console.log(`Slug 변환: ${tag.slug || '(없음)'} → ${uniqueSlug} (${tag.name_ko})`)
        }
      }
      
      // 카테고리 정리 (카테고리 없음 또는 AI 추출 카테고리인 경우)
      if (!tag.category_id || (aiExtractedCategory && tag.category_id === aiExtractedCategory.id)) {
        console.log(`카테고리 재배치 필요: ${tag.name_ko} (현재: ${tag.category_id ? 'AI 추출' : '없음'})`)
        
        // 1단계: 규칙 기반으로 카테고리 추론
        const tagNameForRules = `${(tag.name_ko || '').toLowerCase()} ${(tag.name_en || '').toLowerCase()}`
        const suggestedSlug = inferCategoryByRules(tagNameForRules)
        
        if (suggestedSlug) {
          // 카테고리 존재 확인 또는 생성
          const categoryNames = CATEGORY_NAMES[suggestedSlug]
          if (categoryNames) {
            const categoryId = await ensureCategory(
              supabase,
              suggestedSlug,
              categoryNames.ko,
              categoryNames.en
            )
            
            if (categoryId) {
              // 카테고리가 새로 생성되었는지 확인
              if (!categories?.find((cat) => cat.id === categoryId)) {
                createdCategories++
                // 생성된 카테고리를 목록에 추가
                categories?.push({
                  id: categoryId,
                  slug: suggestedSlug,
                  name_ko: categoryNames.ko,
                  name_en: categoryNames.en,
                })
              }
              
              updates.category_id = categoryId
              needsUpdate = true
              console.log(`카테고리 매핑: ${tag.name_ko} → ${categoryNames.ko} (${suggestedSlug})`)
            }
          }
        } else {
          // 2단계: 규칙으로 못 찾으면 AI 사용
          const aiCategoryId = await inferCategoryWithAI(tag.name_ko || tag.name_en || '', categories || [])
          
          if (aiCategoryId && aiCategoryId !== tag.category_id) {
            updates.category_id = aiCategoryId
            needsUpdate = true
            
            const newCategory = categories?.find((cat) => cat.id === aiCategoryId)
            console.log(`AI 카테고리 변경: ${tag.name_ko} → ${newCategory?.name_ko || aiCategoryId}`)
          }
        }
      }
      
      // 업데이트 필요한 경우만 실행
      if (needsUpdate && Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString()
        
        const { error: updateError } = await supabase
          .from('select_tags')
          .update(updates)
          .eq('id', tag.id)
        
        if (updateError) {
          console.error(`태그 업데이트 오류 (${tag.name_ko}):`, updateError)
        } else {
          updatedCount++
        }
      }
    }
    
    console.log(`✅ 태그 정리 완료: ${updatedCount}/${tags?.length || 0}개 업데이트됨`)
    console.log(`✅ 생성된 카테고리: ${createdCategories}개`)
    
    return NextResponse.json({
      success: true,
      message: '태그 데이터 정리가 완료되었습니다.',
      data: {
        total: tags?.length || 0,
        updated: updatedCount,
        createdCategories,
      },
    })
  } catch (error) {
    console.error('태그 정리 API 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '태그 정리 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

