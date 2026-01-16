'use server'

import { AI_MODELS } from '@/config/ai-prompts'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

// ========================================
// AI 기반 추천 페이지 생성 및 데이터 보강 Actions
// ========================================

/**
 * AI를 이용한 추천 페이지 소개글 생성
 */
export async function generateTopicPageIntro(params: {
  title_ko: string
  where_cities?: string[]
  companions?: string[]
  styles?: string[]
}): Promise<ActionResult<{ intro_rich_ko: string }>> {
  try {
    const { title_ko, where_cities, companions, styles } = params

    if (!title_ko || !title_ko.trim()) {
      return { success: false, error: '제목은 필수입니다.' }
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return { success: false, error: 'OpenAI API 키가 설정되지 않았습니다.' }
    }

    const systemPrompt = `당신은 호텔 예약 사이트의 전문 콘텐츠 작가입니다. 
주어진 토픽 페이지 정보를 바탕으로 매력적이고 SEO에 최적화된 소개글을 작성해주세요.

**중요 지침:**
1. 고객에게 직접 말하는 듯한 친근한 어투 사용 (존댓말)
2. 구체적인 여행 상황과 니즈를 언급하여 공감대 형성
3. 해당 토픽의 매력과 특징을 자연스럽게 설명
4. 200-300자 분량의 간결하면서도 감성적인 소개글
5. 마크다운 형식 사용 가능 (볼드, 이탤릭 등)

**작성 스타일:**
- 첫 문장: 독자의 상황이나 니즈 공감
- 중간: 토픽의 특징과 매력 소개
- 마지막: 행동을 유도하는 부드러운 제안`

    const userPrompt = `토픽 페이지 정보:
- 제목: ${title_ko}
${where_cities && where_cities.length > 0 ? `- 도시: ${where_cities.join(', ')}` : ''}
${companions && companions.length > 0 ? `- 동행인: ${companions.join(', ')}` : ''}
${styles && styles.length > 0 ? `- 스타일: ${styles.join(', ')}` : ''}

위 정보를 바탕으로 토픽 페이지 소개글을 작성해주세요.`

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_MODELS.GPT_4O,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      return { success: false, error: `OpenAI API 호출 실패: ${errorData.error?.message || '알 수 없는 오류'}` }
    }

    const aiResult = await openaiResponse.json()
    const generatedIntro = aiResult.choices?.[0]?.message?.content?.trim()

    if (!generatedIntro) {
      return { success: false, error: 'AI가 소개글을 생성하지 못했습니다.' }
    }

    return {
      success: true,
      data: { intro_rich_ko: generatedIntro },
    }
  } catch (error) {
    console.error('❌ 소개글 생성 중 예외 발생:', error)
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' }
  }
}

/**
 * AI를 이용한 SEO 메타데이터 생성
 */
export async function generateTopicPageSeo(params: {
  title_ko: string
  slug: string
  where_countries?: string[]
  where_cities?: string[]
  companions?: string[]
  styles?: string[]
  intro_rich_ko?: string
}): Promise<ActionResult<any>> {
  try {
    const { title_ko, slug } = params

    if (!title_ko || !slug) {
      return { success: false, error: '제목과 slug는 필수입니다.' }
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return { success: false, error: 'OpenAI API 키가 설정되지 않았습니다.' }
    }

    const systemPrompt = `당신은 호텔 토픽 페이지의 SEO 최적화 전문가입니다.
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

    const userPrompt = `
토픽 페이지 정보:
- 제목: ${title_ko}
- Slug: ${slug}
${params.where_countries?.length ? `- 국가: ${params.where_countries.join(', ')}` : ''}
${params.where_cities?.length ? `- 도시: ${params.where_cities.join(', ')}` : ''}
${params.companions?.length ? `- 동행인: ${params.companions.join(', ')}` : ''}
${params.styles?.length ? `- 스타일: ${params.styles.join(', ')}` : ''}
${params.intro_rich_ko ? `- 소개글: ${params.intro_rich_ko.substring(0, 200)}...` : ''}

이 정보를 바탕으로 SEO에 최적화된 메타데이터를 생성해주세요.`.trim()

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!openaiResponse.ok) {
      return { success: false, error: 'AI 생성 중 오류가 발생했습니다.' }
    }

    const aiResult = await openaiResponse.json()
    let content = aiResult.choices[0]?.message?.content
    
    if (!content) {
      return { success: false, error: 'AI 응답을 받을 수 없습니다.' }
    }

    // JSON 파싱 (마크다운 코드 블록 제거)
    if (content.startsWith('```')) {
      content = content.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim()
    }

    const result = JSON.parse(content)

    return {
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
    }
  } catch (error) {
    console.error('❌ SEO 생성 중 예외 발생:', error)
    return { success: false, error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' }
  }
}

/**
 * 태그 기반 토픽 페이지 템플릿
 */
interface TopicPageTemplate {
  slug: string
  title_ko: string
  categorySlug: string
  tagKeywords: string[]
  companions?: string[]
  styles?: string[]
  intro_ko: string
  seo_description: string
}

const TOPIC_PAGE_TEMPLATES: TopicPageTemplate[] = [
  // 1. 호텔 등급 기반
  {
    slug: 'luxury-hotels',
    title_ko: '럭셔리 호텔 추천',
    categorySlug: 'hotel-grade',
    tagKeywords: ['럭셔리', 'luxury'],
    styles: ['럭셔리'],
    intro_ko: '<p>세계 최고의 럭셔리 호텔을 엄선하여 소개합니다. 최상급 서비스와 품격 있는 경험을 선사합니다.</p>',
    seo_description: '전 세계 최고급 럭셔리 호텔 추천. 프리미엄 서비스와 완벽한 휴식을 경험하세요.',
  },
  {
    slug: 'ultra-premium-hotels',
    title_ko: '최고급 프리미엄 호텔',
    categorySlug: 'hotel-grade',
    tagKeywords: ['최고급프리미엄', 'ultra premium'],
    styles: ['최고급', '럭셔리'],
    intro_ko: '<p>최상위 럭셔리 브랜드의 프리미엄 호텔 컬렉션입니다.</p>',
    seo_description: '파크하얏트, 포시즌스, 리츠칼튼 등 최고급 프리미엄 호텔 추천.',
  },
  {
    slug: 'value-hotels',
    title_ko: '가성비 호텔 추천',
    categorySlug: 'hotel-grade',
    tagKeywords: ['가성비', 'value'],
    intro_ko: '<p>합리적인 가격에 품질 좋은 서비스를 제공하는 가성비 호텔을 소개합니다.</p>',
    seo_description: '가격 대비 최고의 호텔. 합리적인 가격으로 품질 좋은 숙박을 경험하세요.',
  },
  
  // 2. 키즈 친화
  {
    slug: 'family-kids-hotels',
    title_ko: '아이와 함께하는 가족 호텔',
    categorySlug: 'kids',
    tagKeywords: ['키즈', 'kids', '가족여행', 'family'],
    companions: ['가족', '아이와함께'],
    styles: ['패밀리'],
    intro_ko: '<p>아이와 함께 즐길 수 있는 최고의 패밀리 호텔을 소개합니다. 키즈 클럽, 놀이터, 키즈 풀 등 다양한 시설을 갖추고 있습니다.</p>',
    seo_description: '아이와 가족 여행에 완벽한 호텔. 키즈 시설 완비, 패밀리룸, 베이비시터 서비스 제공.',
  },
  {
    slug: 'kids-pool-hotels',
    title_ko: '키즈 풀이 있는 호텔',
    categorySlug: 'kids',
    tagKeywords: ['키즈풀', 'kids pool', '유아전용풀'],
    companions: ['가족', '아이와함께'],
    intro_ko: '<p>아이들을 위한 안전한 키즈 풀을 갖춘 호텔입니다.</p>',
    seo_description: '키즈 풀 별도 운영 호텔. 아이들이 안전하게 물놀이를 즐길 수 있습니다.',
  },
  
  // 3. 수영장
  {
    slug: 'infinity-pool-hotels',
    title_ko: '인피니티 풀 호텔',
    categorySlug: 'pool',
    tagKeywords: ['인피니티', 'infinity'],
    styles: ['럭셔리', '리조트'],
    intro_ko: '<p>숨막히는 전망의 인피니티 풀을 갖춘 최고급 호텔들입니다.</p>',
    seo_description: '인피니티 풀이 있는 럭셔리 호텔 추천. 멋진 전망과 함께하는 특별한 경험.',
  },
  {
    slug: 'rooftop-pool-hotels',
    title_ko: '루프탑 수영장 호텔',
    categorySlug: 'pool',
    tagKeywords: ['루프탑수영장', 'rooftop pool'],
    styles: ['시티뷰', '도심'],
    intro_ko: '<p>도심 스카이라인을 감상하며 수영을 즐길 수 있는 루프탑 풀 호텔입니다.</p>',
    seo_description: '루프탑 수영장이 있는 호텔. 도심 전망과 함께 특별한 수영 경험을 즐기세요.',
  },
  
  // 4. 스파/웰니스
  {
    slug: 'spa-wellness-hotels',
    title_ko: '스파 & 웰니스 호텔',
    categorySlug: 'spa-wellness',
    tagKeywords: ['스파', 'spa', '웰니스', 'wellness'],
    styles: ['힐링', '럭셔리'],
    intro_ko: '<p>몸과 마음을 재충전할 수 있는 프리미엄 스파 & 웰니스 호텔입니다.</p>',
    seo_description: '스파와 웰니스 시설을 갖춘 호텔. 힐링과 재충전의 시간을 가지세요.',
  },
  
  // 5. 식음료
  {
    slug: 'michelin-restaurant-hotels',
    title_ko: '미슐랭 레스토랑 호텔',
    categorySlug: 'dining',
    tagKeywords: ['미슐랭', 'michelin'],
    styles: ['파인다이닝', '최고급'],
    intro_ko: '<p>미슐랭 스타 레스토랑을 갖춘 최고급 호텔 컬렉션입니다.</p>',
    seo_description: '미슐랭 레스토랑이 있는 호텔. 최고의 미식 경험을 제공합니다.',
  },
  
  // 6. 여행 목적
  {
    slug: 'honeymoon-hotels',
    title_ko: '신혼여행 추천 호텔',
    categorySlug: 'travel-purpose',
    tagKeywords: ['신혼여행', 'honeymoon'],
    companions: ['커플', '신혼부부'],
    styles: ['로맨틱', '럭셔리'],
    intro_ko: '<p>평생 잊지 못할 신혼여행을 위한 로맨틱 호텔 추천입니다.</p>',
    seo_description: '신혼여행 추천 호텔. 로맨틱한 분위기와 특별한 서비스로 잊지 못할 추억을 만드세요.',
  },
  {
    slug: 'business-trip-hotels',
    title_ko: '비즈니스 출장 호텔',
    categorySlug: 'business',
    tagKeywords: ['비즈니스', 'business', '출장'],
    companions: ['비즈니스'],
    intro_ko: '<p>효율적인 비즈니스 출장을 위한 최적의 호텔입니다.</p>',
    seo_description: '비즈니스 출장에 적합한 호텔. 비즈니스 센터, 회의실, 고속 와이파이 완비.',
  },
  {
    slug: 'workcation-hotels',
    title_ko: '워케이션 호텔',
    categorySlug: 'travel-purpose',
    tagKeywords: ['워케이션', 'workcation'],
    intro_ko: '<p>일과 휴식을 동시에 즐길 수 있는 워케이션 최적 호텔입니다.</p>',
    seo_description: '워케이션에 완벽한 호텔. 업무 환경과 휴양 시설을 모두 갖춘 공간.',
  },
  
  // 7. 위치 기반
  {
    slug: 'city-center-hotels',
    title_ko: '도심 중심가 호텔',
    categorySlug: 'location',
    tagKeywords: ['도심', '중심가', 'downtown', 'center'],
    intro_ko: '<p>비즈니스와 관광 모두에 최적화된 도심 중심가 호텔입니다.</p>',
    seo_description: '도심 중심가에 위치한 호텔. 쇼핑, 관광, 비즈니스에 모두 편리합니다.',
  },
  {
    slug: 'beach-resort-hotels',
    title_ko: '해변 리조트 호텔',
    categorySlug: 'location',
    tagKeywords: ['해변', 'beach', '비치'],
    styles: ['리조트', '휴양'],
    intro_ko: '<p>푸른 바다를 품은 최고의 해변 리조트 호텔입니다.</p>',
    seo_description: '해변 접근성이 뛰어난 리조트 호텔. 오션뷰와 프라이빗 비치를 즐기세요.',
  },
  
  // 8. 분위기
  {
    slug: 'romantic-hotels',
    title_ko: '로맨틱 호텔',
    categorySlug: 'atmosphere',
    tagKeywords: ['로맨틱', 'romantic'],
    companions: ['커플'],
    styles: ['로맨틱'],
    intro_ko: '<p>특별한 사람과 함께하는 로맨틱한 순간을 위한 호텔입니다.</p>',
    seo_description: '로맨틱한 분위기의 호텔. 커플 여행과 기념일에 완벽한 선택.',
  },
  {
    slug: 'french-style-hotels',
    title_ko: '프랑스 스타일 호텔',
    categorySlug: 'atmosphere',
    tagKeywords: ['프랑스', 'french', '프랑스스타일'],
    styles: ['프랑스', '클래식'],
    intro_ko: '<p>우아한 프랑스 감성을 담은 클래식 호텔입니다.</p>',
    seo_description: '프랑스 스타일의 우아한 호텔. 유럽 감성과 클래식한 분위기를 경험하세요.',
  },
  {
    slug: 'modern-design-hotels',
    title_ko: '모던 디자인 호텔',
    categorySlug: 'atmosphere',
    tagKeywords: ['모던', 'modern', '디자인'],
    styles: ['모던', '디자인'],
    intro_ko: '<p>세련된 모던 디자인이 돋보이는 디자인 호텔입니다.</p>',
    seo_description: '모던 디자인 호텔. 세련되고 감각적인 공간에서 특별한 경험을 즐기세요.',
  },
  {
    slug: 'healing-hotels',
    title_ko: '힐링 호텔',
    categorySlug: 'atmosphere',
    tagKeywords: ['힐링', 'healing'],
    styles: ['힐링', '휴양'],
    intro_ko: '<p>일상에서 벗어나 진정한 휴식을 취할 수 있는 힐링 호텔입니다.</p>',
    seo_description: '힐링과 휴식을 위한 호텔. 몸과 마음을 재충전하는 특별한 시간.',
  },
]

/**
 * 태그 기반 토픽 페이지 자동 생성 (Batch)
 */
export async function generateTopicPagesFromTags(): Promise<ActionResult<{ created: number; skipped: number; total: number }>> {
  try {
    const supabase = await createServiceRoleClient()
    
    let createdCount = 0
    let skippedCount = 0
    
    for (const template of TOPIC_PAGE_TEMPLATES) {
      // 1. 이미 존재하는 slug인지 확인
      const { data: existing } = await supabase
        .from('select_recommendation_pages')
        .select('id')
        .eq('slug', template.slug)
        .maybeSingle()
      
      if (existing) {
        skippedCount++
        continue
      }
      
      // 2. 카테고리 ID 조회
      const { data: category } = await supabase
        .from('select_tag_categories')
        .select('id')
        .eq('slug', template.categorySlug)
        .maybeSingle()
      
      if (!category) {
        skippedCount++
        continue
      }
      
      // 3. 해당 카테고리의 활성 태그 조회
      const { data: tags } = await supabase
        .from('select_tags')
        .select('id, name_ko, name_en, slug')
        .eq('category_id', category.id)
        .eq('is_active', true)
        .order('weight', { ascending: false })
        .limit(10)
      
      if (!tags || tags.length === 0) {
        skippedCount++
        continue
      }
      
      // 4. 키워드와 일치하는 태그 필터링
      const matchingTags = tags.filter((tag) => {
        const searchText = `${tag.name_ko} ${tag.name_en} ${tag.slug}`.toLowerCase()
        return template.tagKeywords.some((keyword) => searchText.includes(keyword.toLowerCase()))
      })
      
      // 5. 해시태그 배열 생성 (최대 8개)
      const hashtags = matchingTags
        .slice(0, 8)
        .map((tag) => tag.name_ko)
        .filter(Boolean)
      
      // 해시태그가 없으면 건너뛰기
      if (hashtags.length === 0) {
        skippedCount++
        continue
      }
      
      // 6. 토픽 페이지 생성
      const { data: newPage, error: insertError } = await supabase
        .from('select_recommendation_pages')
        .insert({
          slug: template.slug,
          title_ko: template.title_ko,
          hashtags,
          where_countries: null,
          where_cities: null,
          companions: template.companions || null,
          styles: template.styles || null,
          hero_image_url: null,
          intro_rich_ko: template.intro_ko,
          status: 'draft',
          publish: false,
          publish_at: null,
          seo_title_ko: `${template.title_ko} | 셀렉트3`,
          seo_description_ko: template.seo_description,
          seo_canonical_url: null,
          meta_robots: 'index, follow',
          og_title: template.title_ko,
          og_description: template.seo_description,
          og_image_url: null,
          twitter_title: null,
          twitter_description: null,
          twitter_image_url: null,
          seo_hreflang: null,
          seo_schema_json: null,
          sitemap_priority: 0.7,
          sitemap_changefreq: 'weekly',
        })
        .select('id')
        .single()
      
      if (insertError || !newPage) {
        skippedCount++
        continue
      }
      
      // 7. 해당 태그를 가진 호텔 조회 및 연결
      const matchingTagIds = matchingTags.map((tag) => tag.id).filter(Boolean)
      
      if (matchingTagIds.length > 0) {
        // 태그를 가진 호텔 조회
        const { data: hotelMappings } = await supabase
          .from('select_hotel_tags_map')
          .select('sabre_id, tag_id')
          .in('tag_id', matchingTagIds)
        
        if (hotelMappings && hotelMappings.length > 0) {
          // sabre_id별로 매칭된 태그 개수 계산
          const hotelTagCounts = new Map<number, number>()
          hotelMappings.forEach((mapping) => {
            const count = hotelTagCounts.get(mapping.sabre_id) || 0
            hotelTagCounts.set(mapping.sabre_id, count + 1)
          })
          
          // 매칭 태그 개수가 많은 순으로 정렬
          const sortedSabreIds = Array.from(hotelTagCounts.entries())
            .sort((a, b) => b[1] - a[1]) // 태그 개수 내림차순
            .map((entry) => entry[0])
          
          // 토픽 페이지에 호텔 연결 (최대 30개)
          const hotelsToConnect = sortedSabreIds.slice(0, 30).map((sabre_id, index) => {
            const matchCount = hotelTagCounts.get(sabre_id) || 0
            return {
              page_id: newPage.id,
              sabre_id,
              pin_to_top: matchCount >= matchingTags.length / 2, // 절반 이상 매칭되면 상단 고정
              rank_manual: index + 1,
            }
          })
          
          await supabase
            .from('select_recommendation_page_hotels')
            .insert(hotelsToConnect)
        }
      }
      
      createdCount++
    }
    
    revalidatePath('/admin/recommendation-pages')
    
    return {
      success: true,
      data: {
        created: createdCount,
        skipped: skippedCount,
        total: TOPIC_PAGE_TEMPLATES.length,
      },
    }
  } catch (error) {
    console.error('❌ 태그 기반 페이지 생성 오류:', error)
    return { success: false, error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' }
  }
}

/**
 * 커스텀 토픽 페이지 생성
 */
export async function generateCustomTopicPage(params: {
  slug: string
  title_ko: string
  intro_ko?: string
  tag_ids: string[]
  tag_names: string[]
}): Promise<ActionResult<{ pageId: string; connectedHotels: number }>> {
  try {
    const { slug, title_ko, intro_ko, tag_ids, tag_names } = params

    if (!slug || !title_ko) {
      return { success: false, error: 'slug와 title_ko는 필수입니다.' }
    }

    if (!tag_ids || tag_ids.length === 0) {
      return { success: false, error: '최소 1개 이상의 태그를 선택해주세요.' }
    }

    const supabase = await createServiceRoleClient()

    // 1. Slug 중복 체크
    const { data: existing } = await supabase
      .from('select_recommendation_pages')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return { success: false, error: '이미 존재하는 slug입니다.' }
    }

    // 2. 토픽 페이지 생성
    const { data: newPage, error: insertError } = await supabase
      .from('select_recommendation_pages')
      .insert({
        slug,
        title_ko,
        hashtags: tag_names || [],
        where_countries: null,
        where_cities: null,
        companions: null,
        styles: null,
        hero_image_url: null,
        intro_rich_ko: intro_ko ? `<p>${intro_ko}</p>` : `<p>${title_ko}</p>`,
        status: 'draft',
        publish: false,
        publish_at: null,
        seo_title_ko: `${title_ko} | 셀렉트3`,
        seo_description_ko: `${title_ko} 추천. 엄선된 호텔 컬렉션을 만나보세요.`,
        seo_canonical_url: null,
        meta_robots: 'index, follow',
        og_title: title_ko,
        og_description: `${title_ko} 추천`,
        og_image_url: null,
        twitter_title: null,
        twitter_description: null,
        twitter_image_url: null,
        seo_hreflang: null,
        seo_schema_json: null,
        sitemap_priority: 0.7,
        sitemap_changefreq: 'weekly',
      })
      .select('id')
      .single()

    if (insertError || !newPage) {
      return { success: false, error: '토픽 페이지 생성에 실패했습니다.' }
    }

    // 3. 선택된 태그를 가진 호텔 조회 및 연결
    const { data: hotelMappings } = await supabase
      .from('select_hotel_tags_map')
      .select('sabre_id, tag_id')
      .in('tag_id', tag_ids)

    let connectedHotelsCount = 0

    if (hotelMappings && hotelMappings.length > 0) {
      // sabre_id별로 매칭된 태그 개수 계산
      const hotelTagCounts = new Map<number, number>()
      hotelMappings.forEach((mapping) => {
        const count = hotelTagCounts.get(mapping.sabre_id) || 0
        hotelTagCounts.set(mapping.sabre_id, count + 1)
      })

      // 매칭 태그 개수가 많은 순으로 정렬
      const sortedSabreIds = Array.from(hotelTagCounts.entries())
        .sort((a, b) => b[1] - a[1]) // 태그 개수 내림차순
        .map((entry) => entry[0])

      // 토픽 페이지에 호텔 연결 (최대 50개)
      const hotelsToConnect = sortedSabreIds.slice(0, 50).map((sabre_id, index) => {
        const matchCount = hotelTagCounts.get(sabre_id) || 0
        return {
          page_id: newPage.id,
          sabre_id,
          pin_to_top: matchCount >= tag_ids.length / 2, // 절반 이상 매칭되면 상단 고정
          rank_manual: index + 1,
        }
      })

      if (hotelsToConnect.length > 0) {
        const { error: connectError } = await supabase
          .from('select_recommendation_page_hotels')
          .insert(hotelsToConnect)

        if (!connectError) {
          connectedHotelsCount = hotelsToConnect.length
        }
      }
    }

    revalidatePath('/admin/recommendation-pages')
    
    return {
      success: true,
      data: {
        pageId: newPage.id,
        connectedHotels: connectedHotelsCount,
      },
    }
  } catch (error) {
    console.error('❌ 커스텀 토픽 페이지 생성 오류:', error)
    return { success: false, error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' }
  }
}
