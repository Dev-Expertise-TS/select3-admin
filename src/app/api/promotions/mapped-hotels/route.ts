import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()

    // select_hotel_promotions_map 테이블에서 매핑된 호텔 정보 조회
    const { data: mappings, error: mappingError } = await supabase
      .from('select_hotel_promotions_map')
      .select(`
        sabre_id,
        promotion_id,
        select_hotel_promotions!inner(
          promotion,
          promotion_id
        ),
        select_hotels!inner(
          sabre_id,
          property_name_ko,
          property_name_en
        )
      `)

    if (mappingError) {
      console.error('매핑 조회 오류:', mappingError)
      return NextResponse.json(
        { success: false, error: '매핑된 호텔 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 데이터 변환
    const mappedHotels = mappings?.map(mapping => ({
      sabre_id: mapping.sabre_id,
      promotion_id: mapping.promotion_id,
      promotion_name: mapping.select_hotel_promotions.promotion,
      property_name_ko: mapping.select_hotels.property_name_ko,
      property_name_en: mapping.select_hotels.property_name_en,
    })) || []

    return NextResponse.json({
      success: true,
      data: mappedHotels,
    })

  } catch (error) {
    console.error('매핑된 호텔 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
