import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * 브랜드 목록 조회 API (블로그 아티클 브랜드 연결용)
 * hotel_brands 테이블에서 brand_id와 brand_name_en 조회
 */
export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    // 브랜드 목록 조회 (실제 컬럼명: brand_name_en, brand_name_ko)
    const { data: brands, error } = await supabase
      .from('hotel_brands')
      .select('brand_id, brand_name_en, brand_name_ko')
      .order('brand_name_en', { ascending: true })

    if (error) {
      console.error('브랜드 목록 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '브랜드 목록을 조회할 수 없습니다.' },
        { status: 500 }
      )
    }

    // brand_name_en이 있는 브랜드만 필터링
    const validBrands = (brands || []).filter(b => b.brand_name_en)

    return NextResponse.json({
      success: true,
      data: validBrands
    })
  } catch (err) {
    console.error('브랜드 목록 조회 중 오류 발생:', err)
    return NextResponse.json(
      { success: false, error: '브랜드 목록을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

