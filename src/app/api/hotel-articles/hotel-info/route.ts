import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET: Sabre ID로 호텔 정보 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sabreId = searchParams.get('sabre_id')

    if (!sabreId) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en')
      .eq('sabre_id', sabreId)
      .single()

    if (error) {
      console.error('호텔 정보 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '호텔 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || null
    })

  } catch (error) {
    console.error('호텔 정보 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST: 여러 Sabre ID로 호텔 정보 일괄 조회
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sabreIds } = body

    if (!sabreIds || !Array.isArray(sabreIds)) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID 배열이 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Sabre ID를 문자열로 변환하여 처리
    const cleanSabreIds = sabreIds
      .filter(id => id && id.trim())
      .map(id => String(id).trim())

    console.log('조회할 Sabre IDs:', cleanSabreIds)

    const { data, error } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en')
      .in('sabre_id', cleanSabreIds)

    if (error) {
      console.error('호텔 정보 일괄 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '호텔 정보를 조회할 수 없습니다.' },
        { status: 500 }
      )
    }

    // Sabre ID를 키로 하는 객체로 변환
    const hotelMap = (data || []).reduce((acc, hotel) => {
      acc[hotel.sabre_id] = hotel
      return acc
    }, {} as Record<string, { sabre_id: string; property_name_ko: string; property_name_en: string }>)

    console.log('호텔 정보 API 응답:', {
      sabreIds,
      foundHotels: data?.length || 0,
      hotelMap
    })

    return NextResponse.json({
      success: true,
      data: hotelMap
    })

  } catch (error) {
    console.error('호텔 정보 일괄 조회 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
