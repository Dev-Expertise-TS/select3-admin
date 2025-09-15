import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface HotelImageData {
  sabre_id: string | null
  property_name_ko: string | null
  property_name_en: string | null
  image_1: string | null
  image_2: string | null
  image_3: string | null
  image_4: string | null
  image_5: string | null
}

interface HotelImageResponse {
  success: boolean
  data?: HotelImageData
  error?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelCode = searchParams.get('sabreCode') // 파라미터명은 기존과 동일하게 유지

    if (!hotelCode) {
      return NextResponse.json<HotelImageResponse>(
        { success: false, error: '호텔 코드가 필요합니다.' },
        { status: 400 }
      )
    }

    // select_hotels 테이블에서 호텔 정보와 이미지 컬럼들을 가져옴
    const supabase = createServiceRoleClient()
    
    // sabre_id로 검색
    const { data: hotelData, error: hotelError } = await supabase
      .from('select_hotels')
      .select(`
        sabre_id,
        property_name_ko,
        property_name_en,
        image_1,
        image_2,
        image_3,
        image_4,
        image_5
      `)
      .eq('sabre_id', hotelCode)
      .single()

    if (hotelError) {
      console.error('호텔 데이터 조회 오류:', hotelError)
      return NextResponse.json<HotelImageResponse>(
        { success: false, error: '호텔 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (!hotelData) {
      return NextResponse.json<HotelImageResponse>(
        { success: false, error: '해당 Sabre ID의 호텔을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json<HotelImageResponse>({
      success: true,
      data: hotelData
    })

  } catch (error) {
    console.error('호텔 이미지 조회 오류:', error)
    return NextResponse.json<HotelImageResponse>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}