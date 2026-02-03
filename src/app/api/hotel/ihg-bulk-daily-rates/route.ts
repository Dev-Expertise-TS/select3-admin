import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * 단일 호텔의 일자별 객실 데이터 조회
 */
async function fetchHotelDailyRates(
  sabreId: string,
  checkInDate: string,
  checkOutDate: string,
  adults: number,
  children: number,
  ratePlanCodes?: string[]
) {
  try {
    const requestData: any = {
      HotelCode: sabreId,
      CurrencyCode: 'KRW',
      StartDate: checkInDate,
      EndDate: checkOutDate,
      Adults: adults,
      Children: children,
    }

    if (ratePlanCodes && ratePlanCodes.length > 0) {
      requestData.RatePlanCode = ratePlanCodes
      requestData.ExactMatchOnly = true
    }

    const response = await fetch('https://sabre-nodejs-9tia3.ondigitalocean.app/public/hotel/sabre/hotel-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })

    const responseText = await response.text()

    let result: any = null
    try {
      result = JSON.parse(responseText)
    } catch (e) {
      console.error(`[ihg-bulk-daily-rates] Hotel ${sabreId} JSON Parse Error:`, e)
      return { success: false, error: 'Sabre API 응답을 파싱할 수 없습니다.', rawResponse: responseText }
    }

    if (!response.ok) {
      return { success: false, error: `Sabre API 오류: ${response.status}`, rawResponse: responseText }
    }

    return { success: true, data: result, rawResponse: responseText }
  } catch (error: any) {
    console.error(`[ihg-bulk-daily-rates] Hotel ${sabreId} fetch error:`, error)
    return { success: false, error: error.message || '호텔 데이터 조회 중 오류가 발생했습니다.' }
  }
}

/**
 * IHG 호텔들의 일자별 객실 데이터 일괄 조회
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { checkInDate, checkOutDate, adults = 2, children = 0, ratePlanCodes, hotelIndex } = body

    if (!checkInDate || !checkOutDate) {
      return NextResponse.json(
        { success: false, error: '체크인 날짜와 체크아웃 날짜는 필수입니다.' },
        { status: 400 }
      )
    }

    // IHG 호텔 목록 조회
    const supabase = createServiceRoleClient()

    const { data: chain, error: chainError } = await supabase
      .from('hotel_chains')
      .select('chain_id')
      .eq('chain_slug', 'ihg')
      .single()

    if (chainError || !chain) {
      return NextResponse.json(
        { success: false, error: 'IHG 체인을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const { data: brands, error: brandsError } = await supabase
      .from('hotel_brands')
      .select('brand_id')
      .eq('chain_id', chain.chain_id)

    if (brandsError) {
      return NextResponse.json(
        { success: false, error: '브랜드 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    const brandIds = (brands || []).map(b => b.brand_id)

    if (brandIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { hotels: [], totalCount: 0 },
      })
    }

    // brand_id, brand_id_2, brand_id_3 중 하나라도 일치하는 호텔 조회
    // 개별 쿼리 실행 후 병합
    const { data: hotels1, error: error1 } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, rate_plan_code')
      .in('brand_id', brandIds)

    const { data: hotels2, error: error2 } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, rate_plan_code')
      .in('brand_id_2', brandIds)

    const { data: hotels3, error: error3 } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, rate_plan_code')
      .in('brand_id_3', brandIds)

    if (error1 || error2 || error3) {
      return NextResponse.json(
        { success: false, error: '호텔 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 중복 제거 (sabre_id 기준)
    const hotelMap = new Map<string, typeof hotels1[0]>()
    ;[...(hotels1 || []), ...(hotels2 || []), ...(hotels3 || [])].forEach((hotel) => {
      if (hotel && hotel.sabre_id) {
        hotelMap.set(hotel.sabre_id, hotel)
      }
    })

    const hotels = Array.from(hotelMap.values()).sort((a, b) => {
      const nameA = a.property_name_ko || a.property_name_en || ''
      const nameB = b.property_name_ko || b.property_name_en || ''
      return nameA.localeCompare(nameB)
    })

    const totalHotels = hotels?.length || 0

    // 특정 호텔만 조회하는 경우 (hotelIndex가 제공된 경우)
    if (typeof hotelIndex === 'number' && hotelIndex >= 0 && hotelIndex < totalHotels) {
      const hotel = hotels![hotelIndex]
      const hotelRatePlanCodes = hotel.rate_plan_code
        ? hotel.rate_plan_code.split(',').map((c: string) => c.trim()).filter(Boolean)
        : []

      const codesToUse = ratePlanCodes && ratePlanCodes.length > 0
        ? ratePlanCodes
        : (hotelRatePlanCodes.length > 0 ? hotelRatePlanCodes : [])

      // Start Date부터 End Date까지 1박씩 조회
      const startDate = new Date(checkInDate)
      const endDate = new Date(checkOutDate)
      const dailyData: Array<{ checkInDate: string; data: any; rawResponse: string }> = []

      for (let currentDate = new Date(startDate); currentDate < endDate; currentDate.setDate(currentDate.getDate() + 1)) {
        const currentCheckIn = currentDate.toISOString().split('T')[0]
        const currentCheckOut = new Date(currentDate)
        currentCheckOut.setDate(currentCheckOut.getDate() + 1)
        const currentCheckOutStr = currentCheckOut.toISOString().split('T')[0]

        const result = await fetchHotelDailyRates(
          hotel.sabre_id,
          currentCheckIn,
          currentCheckOutStr,
          adults,
          children,
          codesToUse
        )

        if (result.success) {
          dailyData.push({
            checkInDate: currentCheckIn,
            data: result.data,
            rawResponse: result.rawResponse || '',
          })
        } else {
          // 오류가 있어도 계속 진행 (로그만 남김)
          console.warn(`[ihg-bulk-daily-rates] Hotel ${hotel.sabre_id} (${currentCheckIn}) error:`, result.error)
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          hotel: {
            sabre_id: hotel.sabre_id,
            name_ko: hotel.property_name_ko,
            name_en: hotel.property_name_en,
          },
          dailyData,
          hotelIndex,
          totalCount: totalHotels,
        },
      })
    }

    // 전체 호텔 목록 반환 (실제 조회는 클라이언트에서 순차적으로 수행)
    return NextResponse.json({
      success: true,
      data: {
        hotels: (hotels || []).map(hotel => ({
          sabre_id: hotel.sabre_id,
          name_ko: hotel.property_name_ko,
          name_en: hotel.property_name_en,
          rate_plan_code: hotel.rate_plan_code,
        })),
        totalCount: totalHotels,
      },
    })
  } catch (error: any) {
    console.error('[ihg-bulk-daily-rates] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
