import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 300 // 5분 캐시

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    // 체인 개수
    const { count: chainCount } = await supabase
      .from('hotel_chains')
      .select('*', { count: 'exact', head: true })

    // 브랜드 개수
    const { count: brandCount } = await supabase
      .from('hotel_brands')
      .select('*', { count: 'exact', head: true })

    // 전체 호텔 개수
    const { count: totalHotels } = await supabase
      .from('select_hotels')
      .select('*', { count: 'exact', head: true })

    // Sabre ID가 누락된 호텔 개수
    const { count: missingSabreId } = await supabase
      .from('select_hotels')
      .select('*', { count: 'exact', head: true })
      .or('sabre_id.is.null,sabre_id.eq.')

    // 체인&브랜드 연결이 누락된 호텔 개수
    const { count: missingChainBrand } = await supabase
      .from('select_hotels')
      .select('*', { count: 'exact', head: true })
      .is('brand_id', null)

    // 혜택 매핑이 없는 호텔 개수 (혜택 테이블과 조인하여 확인)
    const { data: hotelsWithBenefits } = await supabase
      .from('select_hotel_benefits_map')
      .select('sabre_id')

    const hotelsWithBenefitsSet = new Set(
      hotelsWithBenefits?.map(item => item.sabre_id) || []
    )

    const { data: allHotels } = await supabase
      .from('select_hotels')
      .select('sabre_id')

    const missingBenefits = allHotels?.filter(
      hotel => hotel.sabre_id && !hotelsWithBenefitsSet.has(hotel.sabre_id)
    ).length || 0

    // 호텔 소개 아티클이 누락된 호텔 개수 (예시 - 실제 컬럼명에 따라 조정 필요)
    const { count: missingIntroArticle } = await supabase
      .from('select_hotels')
      .select('*', { count: 'exact', head: true })
      .or('intro_article.is.null,intro_article.eq.')

    // 호텔 블로그 아티클이 누락된 호텔 개수 (예시 - 실제 컬럼명에 따라 조정 필요)
    const { count: missingBlogArticle } = await supabase
      .from('select_hotels')
      .select('*', { count: 'exact', head: true })
      .or('blog_article.is.null,blog_article.eq.')

    const stats = {
      totalHotels: totalHotels || 0,
      chainCount: chainCount || 0,
      brandCount: brandCount || 0,
      missingSabreId: missingSabreId || 0,
      missingChainBrand: missingChainBrand || 0,
      missingBenefits: missingBenefits,
      missingIntroArticle: missingIntroArticle || 0,
      missingBlogArticle: missingBlogArticle || 0,
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '통계 데이터를 가져오는 중 오류가 발생했습니다.'
      },
      { status: 500 }
    )
  }
}
