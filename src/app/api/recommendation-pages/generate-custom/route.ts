import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * POST /api/topic-pages/generate-custom
 * 사용자가 직접 선택한 태그로 토픽 페이지 생성
 */
export async function POST(request: NextRequest) {
  try {
    const { slug, title_ko, intro_ko, tag_ids, tag_names } = await request.json()

    if (!slug || !title_ko) {
      return NextResponse.json(
        { success: false, error: 'slug와 title_ko는 필수입니다.' },
        { status: 400 }
      )
    }

    if (!tag_ids || tag_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '최소 1개 이상의 태그를 선택해주세요.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // 1. Slug 중복 체크
    const { data: existing } = await supabase
      .from('select_recommendation_pages')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { success: false, error: '이미 존재하는 slug입니다.' },
        { status: 409 }
      )
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
      console.error('토픽 페이지 생성 오류:', insertError)
      return NextResponse.json(
        { success: false, error: '토픽 페이지 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    console.log(`✅ 커스텀 토픽 페이지 생성: ${slug}`)

    // 3. 선택된 태그를 가진 호텔 조회 및 연결
    const { data: hotelMappings } = await supabase
      .from('select_hotel_tags_map')
      .select('sabre_id, tag_id')
      .in('tag_id', tag_ids)

    let connectedHotels = 0

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

        if (connectError) {
          console.error('호텔 연결 오류:', connectError)
        } else {
          connectedHotels = hotelsToConnect.length
          const pinnedCount = hotelsToConnect.filter((h) => h.pin_to_top).length
          console.log(`   ✅ 호텔 ${connectedHotels}개 연결됨 (상단 고정: ${pinnedCount}개)`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '토픽 페이지가 생성되었습니다.',
      data: {
        pageId: newPage.id,
        connectedHotels,
      },
    })
  } catch (error) {
    console.error('커스텀 토픽 페이지 생성 API 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '토픽 페이지 생성 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

