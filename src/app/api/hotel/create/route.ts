import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateHotelSlug, slugWithSuffix } from '@/lib/hotel-slug'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sabre_id, hotel_data } = body
    const duplicateSabreIdMessage =
      '동일한 Sabre ID가 이미 존재 합니다. 해당 아이디로 검색 후 호텔 정보 수정을 해주세요'
    
    if (!sabre_id) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID가 필요합니다' },
        { status: 400 }
      )
    }

    if (!hotel_data || Object.keys(hotel_data).length === 0) {
      return NextResponse.json(
        { success: false, error: '호텔 데이터가 필요합니다' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    
    // 먼저 해당 Sabre ID가 이미 존재하는지 확인
    const { data: existingHotel, error: checkError } = await supabase
      .from('select_hotels')
      .select('sabre_id')
      .eq('sabre_id', sabre_id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('호텔 존재 여부 확인 오류:', checkError)
      return NextResponse.json(
        { success: false, error: '호텔 존재 여부 확인 중 오류가 발생했습니다' },
        { status: 500 }
      )
    }

    if (existingHotel) {
      return NextResponse.json(
        { success: false, error: duplicateSabreIdMessage },
        { status: 409 }
      )
    }

    // 호텔 데이터에 sabre_id, slug 추가 (hotel-update/new와 동일 로직)
    const { id: _id, created_at: _created_at, ...allowedHotelData } = hotel_data
    const propertyNameEn = hotel_data?.property_name_en ?? ''
    const propertyNameKo = hotel_data?.property_name_ko ?? ''
    const slug = generateHotelSlug(propertyNameEn, propertyNameKo, sabre_id)

    const insertData = {
      sabre_id,
      slug,
      ...allowedHotelData,
      publish: false,
      created_at: new Date().toISOString(),
    }

    // 호텔 데이터 삽입
    let { data, error } = await supabase
      .from('select_hotels')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      const err = error as { code?: string; message?: string }
      const isUniqueViolation = err.code === '23505'
      const message = (err.message || '').toLowerCase()
      const isSabreIdConflict =
        isUniqueViolation && (message.includes('sabre_id') || message.includes('sabre id'))
      const isSlugConflict = isUniqueViolation && message.includes('slug')

      if (isSabreIdConflict) {
        return NextResponse.json(
          { success: false, error: duplicateSabreIdMessage },
          { status: 409 }
        )
      }

      // slug 유니크 충돌 시 sabreId suffix로 재시도 (hotel-update/new와 동일)
      if (isSlugConflict) {
        const retryData = { ...insertData, slug: slugWithSuffix(slug, sabre_id) }
        const retry = await supabase
          .from('select_hotels')
          .insert(retryData)
          .select()
          .single()
        if (retry.error) {
          console.error('호텔 데이터 생성 오류(slug 재시도 실패):', retry.error)
          return NextResponse.json(
            { success: false, error: '호텔 데이터 생성 중 오류가 발생했습니다' },
            { status: 500 }
          )
        }
        data = retry.data
      } else {
        console.error('호텔 데이터 생성 오류:', error)
        return NextResponse.json(
          { success: false, error: '호텔 데이터 생성 중 오류가 발생했습니다' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { success: true, data, message: '호텔 데이터가 성공적으로 생성되었습니다' },
      { status: 201 }
    )

  } catch (error) {
    console.error('호텔 데이터 생성 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
