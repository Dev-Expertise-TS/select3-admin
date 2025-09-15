import { NextRequest, NextResponse } from 'next/server'
import { sabreFetchWithRetry } from '@/lib/sabre'

// type HotelRatesRequest = {
//   hotelId: string
//   checkInDate: string
//   checkOutDate: string
//   adults?: number
//   children?: number
//   currency?: string
//   ratePlanCodes?: string[]
// }

type HotelRatesResponse = {
  hotelId: string
  checkInDate: string
  checkOutDate: string
  rooms: Array<{
    roomType: {
      code: string
      name: string
      description: string
    }
    ratePlans: Array<{
      code: string
      name: string
      description: string
      rateType: string
      cancellationPolicy: {
        description: string
        penalty: string
      }
      pricing: {
        currency: string
        baseRate: number
        totalRate: number
        taxes: number
        fees: number
      }
      amenities: string[]
      availability: string
    }>
  }>
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotelId')
    const checkInDate = searchParams.get('checkInDate')
    const checkOutDate = searchParams.get('checkOutDate')
    // const adults = parseInt(searchParams.get('adults') || '2')
    // const children = parseInt(searchParams.get('children') || '0')
    // const currency = searchParams.get('currency') || 'USD'
    // const ratePlanCodes = searchParams.get('ratePlanCodes')?.split(',')

    if (!hotelId || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        { success: false, error: 'hotelId, checkInDate, checkOutDate는 필수입니다' },
        { status: 400 }
      )
    }

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(checkInDate) || !dateRegex.test(checkOutDate)) {
      return NextResponse.json(
        { success: false, error: '날짜 형식은 YYYY-MM-DD여야 합니다' },
        { status: 400 }
      )
    }

    // 요청 데이터 구성 (GET 요청에서는 URL 파라미터로 전달)
    // const requestData: HotelRatesRequest = {
    //   hotelId,
    //   checkInDate,
    //   checkOutDate,
    //   adults,
    //   children,
    //   currency,
    //   ratePlanCodes
    // }

    // Sabre API 호출 (재시도 로직 포함)
    const response = await sabreFetchWithRetry<HotelRatesResponse>('/v4/shop/hotels/rates', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }, 3, 2000) // 3회 재시도, 2초 간격

    return NextResponse.json({
      success: true,
      data: response
    }, { status: 200 })

  } catch (error) {
    console.error('호텔 요금 조회 오류 (GET):', error)
    
    // Sabre API 타임아웃 오류 처리
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json(
        { 
          success: false, 
          error: '호텔 데이터 제공업체 응답 시간 초과입니다. 잠시 후 다시 시도해주세요.',
          code: 'SUPPLIER_TIMEOUT'
        },
        { status: 408 }
      )
    }
    
    // Sabre API 공급업체 오류 처리
    if (error instanceof Error && error.message.includes('Vendor response error')) {
      return NextResponse.json(
        { 
          success: false, 
          error: '호텔 데이터 제공업체에서 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          code: 'VENDOR_ERROR'
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: '호텔 요금 정보를 가져오는 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hotelId, checkInDate, checkOutDate, adults = 2, children = 0, currency = 'USD', ratePlanCodes } = body

    if (!hotelId || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        { success: false, error: 'hotelId, checkInDate, checkOutDate는 필수입니다' },
        { status: 400 }
      )
    }

    // 요청 데이터 구성
    const requestData = {
      hotelId,
      checkInDate,
      checkOutDate,
      rooms: [{
        adults,
        children
      }],
      currency,
      ...(ratePlanCodes && { ratePlanCodes })
    }

    // Sabre API 호출 (재시도 로직 포함)
    const response = await sabreFetchWithRetry<HotelRatesResponse>('/v4/shop/hotels/rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    }, 3, 2000) // 3회 재시도, 2초 간격

    return NextResponse.json({
      success: true,
      data: response
    }, { status: 200 })

  } catch (error) {
    console.error('호텔 요금 조회 오류 (POST):', error)
    
    // Sabre API 타임아웃 오류 처리
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json(
        { 
          success: false, 
          error: '호텔 데이터 제공업체 응답 시간 초과입니다. 잠시 후 다시 시도해주세요.',
          code: 'SUPPLIER_TIMEOUT'
        },
        { status: 408 }
      )
    }
    
    // Sabre API 공급업체 오류 처리
    if (error instanceof Error && error.message.includes('Vendor response error')) {
      return NextResponse.json(
        { 
          success: false, 
          error: '호텔 데이터 제공업체에서 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          code: 'VENDOR_ERROR'
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: '호텔 요금 정보를 가져오는 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
