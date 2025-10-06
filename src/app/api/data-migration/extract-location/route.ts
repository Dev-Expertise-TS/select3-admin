import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractLocationFromAddress } from '@/lib/openai-location-extractor'

export async function POST(request: NextRequest) {
  try {
    const { sabreId } = await request.json()

    if (!sabreId) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID가 필요합니다' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 호텔 정보 조회
    const { data: hotel, error: fetchError } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_address, city_ko, city_en, country_ko, country_en, continent_ko, continent_en')
      .eq('sabre_id', sabreId)
      .single()

    if (fetchError || !hotel) {
      return NextResponse.json(
        { success: false, error: '호텔을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const propertyAddress = hotel.property_address as string

    if (!propertyAddress || propertyAddress.trim() === '') {
      return NextResponse.json(
        { success: false, error: '호텔 주소가 없습니다' },
        { status: 400 }
      )
    }

    // OpenAI로 위치 정보 추출
    const locationInfo = await extractLocationFromAddress(propertyAddress)

    if (!locationInfo) {
      return NextResponse.json(
        { success: false, error: '위치 정보 추출 실패' },
        { status: 500 }
      )
    }

    // DB 업데이트
    const { error: updateError } = await supabase
      .from('select_hotels')
      .update({
        city_ko: locationInfo.city_ko,
        city_en: locationInfo.city_en,
        country_ko: locationInfo.country_ko,
        country_en: locationInfo.country_en,
        continent_ko: locationInfo.continent_ko,
        continent_en: locationInfo.continent_en
      })
      .eq('sabre_id', sabreId)

    if (updateError) {
      console.error('DB 업데이트 오류:', updateError)
      return NextResponse.json(
        { success: false, error: 'DB 업데이트 실패' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        sabre_id: sabreId,
        property_address: propertyAddress,
        ...locationInfo
      }
    })
  } catch (error) {
    console.error('위치 정보 추출 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

