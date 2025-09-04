import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { record, columnMapping } = body

    if (!record || !columnMapping) {
      return NextResponse.json(
        { success: false, error: '레코드 데이터와 컬럼 매핑이 필요합니다' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // 컬럼 매핑을 통해 select_hotels 형식으로 데이터 변환
    const hotelData: Record<string, unknown> = {}
    
    Object.entries(columnMapping).forEach(([csvColumn, selectHotelsColumn]) => {
      if (selectHotelsColumn && record[csvColumn] !== undefined) {
        const value = record[csvColumn]
        
        // 데이터 타입 변환
        if (selectHotelsColumn === 'id_old' || selectHotelsColumn === 'sort_id' || 
            selectHotelsColumn === 'paragon_id' || selectHotelsColumn === 'brand_id' || 
            selectHotelsColumn === 'destination_sort') {
          // 숫자 타입
          hotelData[selectHotelsColumn as string] = value ? Number(value) : null
        } else if (selectHotelsColumn === 'badge' || selectHotelsColumn === 'badge_1' || 
                   selectHotelsColumn === 'badge_2' || selectHotelsColumn === 'badge_3') {
          // 불린 타입 (문자열로 저장)
          hotelData[selectHotelsColumn as string] = value ? String(value) : null
        } else {
          // 문자열 타입
          hotelData[selectHotelsColumn as string] = value ? String(value) : null
        }
      }
    })

    // sabre_id가 없으면 오류
    if (!hotelData.sabre_id) {
      return NextResponse.json(
        { success: false, error: 'sabre_id는 필수입니다' },
        { status: 400 }
      )
    }

    // 기존 레코드 확인
    const { data: existingHotel, error: checkError } = await supabase
      .from('select_hotels')
      .select('sabre_id')
      .eq('sabre_id', hotelData.sabre_id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('기존 호텔 확인 오류:', checkError)
      return NextResponse.json(
        { success: false, error: '기존 호텔 확인 중 오류가 발생했습니다' },
        { status: 500 }
      )
    }

    let result
    if (existingHotel) {
      // 업데이트
      const { data, error } = await supabase
        .from('select_hotels')
        .update(hotelData)
        .eq('sabre_id', hotelData.sabre_id)
        .select()
        .single()

      if (error) {
        console.error('호텔 업데이트 오류:', error)
        return NextResponse.json(
          { success: false, error: '호텔 업데이트 중 오류가 발생했습니다' },
          { status: 500 }
        )
      }

      result = { data, action: 'updated' }
    } else {
      // 생성
      const { data, error } = await supabase
        .from('select_hotels')
        .insert({
          ...hotelData,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('호텔 생성 오류:', error)
        return NextResponse.json(
          { success: false, error: '호텔 생성 중 오류가 발생했습니다' },
          { status: 500 }
        )
      }

      result = { data, action: 'created' }
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      action: result.action,
      message: `호텔이 성공적으로 ${result.action === 'created' ? '생성' : '업데이트'}되었습니다`
    }, { status: 200 })

  } catch (error) {
    console.error('호텔 upsert 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
