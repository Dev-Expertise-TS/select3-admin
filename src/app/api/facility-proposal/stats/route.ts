import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 300 // 5분 캐시

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    // 전체 호텔 개수
    const { count: totalHotels } = await supabase
      .from('select_hotels')
      .select('*', { count: 'exact', head: true })

    // 체인 개수
    const { count: chainCount } = await supabase
      .from('hotel_chains')
      .select('*', { count: 'exact', head: true })

    // 브랜드 개수
    const { count: brandCount } = await supabase
      .from('hotel_brands')
      .select('*', { count: 'exact', head: true })

    // 이미지가 있는 호텔 개수
    const { data: hotelsWithImages } = await supabase
      .from('select_hotel_media')
      .select('sabre_id', { count: 'exact' })
      .limit(1)

    const { count: imageCount } = await supabase
      .from('select_hotel_media')
      .select('*', { count: 'exact', head: true })

    // 혜택이 연결된 호텔 개수
    const { data: hotelsWithBenefits } = await supabase
      .from('select_hotel_benefits_map')
      .select('sabre_id', { count: 'exact' })

    const hotelsWithBenefitsSet = new Set(
      hotelsWithBenefits?.map(item => item.sabre_id) || []
    )

    // 호텔 블로그 아티클 개수 (select_hotel_blogs 테이블 사용)
    // 먼저 실제 데이터를 조회해서 확인
    const { data: articlesData, error: articlesDataError } = await supabase
      .from('select_hotel_blogs')
      .select('id')
    
    if (articlesDataError) {
      console.error('호텔 아티클 데이터 조회 오류:', articlesDataError)
    }
    
    // count 쿼리로도 확인
    const { count: articleCount, error: articleError } = await supabase
      .from('select_hotel_blogs')
      .select('id', { count: 'exact', head: true })
    
    if (articleError) {
      console.error('호텔 아티클 개수 조회 오류:', articleError)
    }
    
    // 실제 데이터 개수와 count 결과 비교
    const actualCount = articlesData?.length || 0
    const countResult = articleCount || 0
    
    console.log('호텔 아티클 통계:', {
      actualDataCount: actualCount,
      countQueryResult: countResult,
      using: actualCount > 0 ? actualCount : countResult
    })
    
    // 실제 데이터가 있으면 그것을 사용, 없으면 count 결과 사용
    const finalArticleCount = actualCount > 0 ? actualCount : countResult

    // 추천 페이지 개수
    const { count: recommendationPageCount } = await supabase
      .from('select_recommendation_pages')
      .select('*', { count: 'exact', head: true })

    // 혜택 마스터 개수
    const { count: benefitCount } = await supabase
      .from('select_hotel_benefits')
      .select('*', { count: 'exact', head: true })

    // 지역 매핑 개수
    const { count: regionCount } = await supabase
      .from('select_regions')
      .select('*', { count: 'exact', head: true })

    const stats = {
      totalHotels: totalHotels || 0,
      chainCount: chainCount || 0,
      brandCount: brandCount || 0,
      imageCount: imageCount || 0,
      hotelsWithBenefits: hotelsWithBenefitsSet.size,
      articleCount: finalArticleCount,
      recommendationPageCount: recommendationPageCount || 0,
      benefitCount: benefitCount || 0,
      regionCount: regionCount || 0,
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Facility proposal stats error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '통계 데이터를 가져오는 중 오류가 발생했습니다.'
      },
      { status: 500 }
    )
  }
}
