import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

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
 * POST /api/topic-pages/generate-from-tags
 * 태그와 카테고리 기반으로 토픽 페이지 자동 생성
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    
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
        console.log(`⏭️ 건너뜀 (이미 존재): ${template.slug}`)
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
        console.log(`⚠️ 카테고리 없음: ${template.categorySlug}`)
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
        console.log(`⚠️ 태그 없음: ${template.categorySlug}`)
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
        console.log(`⚠️ 매칭되는 태그 없음: ${template.slug}`)
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
        console.error(`❌ 생성 실패 (${template.slug}):`, insertError)
        skippedCount++
        continue
      }
      
      console.log(`✅ 생성 완료: ${template.slug} (태그 ${hashtags.length}개)`)
      
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
          
          const { error: connectError } = await supabase
            .from('select_recommendation_page_hotels')
            .insert(hotelsToConnect)
          
          if (connectError) {
            console.error(`⚠️ 호텔 연결 실패 (${template.slug}):`, connectError)
          } else {
            const pinnedCount = hotelsToConnect.filter((h) => h.pin_to_top).length
            console.log(`   ✅ 호텔 ${hotelsToConnect.length}개 연결됨 (상단 고정: ${pinnedCount}개)`)
          }
        }
      }
      
      createdCount++
    }
    
    console.log(`\n✅ 토픽 페이지 생성 완료: ${createdCount}개 생성, ${skippedCount}개 건너뜀`)
    
    return NextResponse.json({
      success: true,
      message: '토픽 페이지가 생성되었습니다.',
      data: {
        created: createdCount,
        skipped: skippedCount,
        total: TOPIC_PAGE_TEMPLATES.length,
      },
    })
  } catch (error) {
    console.error('토픽 페이지 생성 API 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '토픽 페이지 생성 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

