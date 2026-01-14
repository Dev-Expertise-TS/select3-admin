import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { sabre_id, chain_id, brand_id, brand_position } = await request.json()

    // 입력 검증
    if (!sabre_id || !chain_id || !brand_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'sabre_id, chain_id, brand_id는 모두 필요합니다.' 
      }, { status: 400 })
    }

    // brand_position은 1, 2, 3 중 하나여야 함 (기본값: 1)
    const position = brand_position && [1, 2, 3].includes(brand_position) ? brand_position : 1

    const supabase = createServiceRoleClient()

    // 호텔이 존재하는지 확인
    const { data: hotel, error: hotelError } = await supabase
      .from('select_hotels')
      .select('sabre_id, brand_id, brand_id_2, brand_id_3')
      .eq('sabre_id', sabre_id)
      .single()

    if (hotelError || !hotel) {
      return NextResponse.json({ 
        success: false, 
        error: '해당 호텔을 찾을 수 없습니다.' 
      }, { status: 404 })
    }

    // 체인이 존재하는지 확인
    const { data: chain, error: chainError } = await supabase
      .from('hotel_chains')
      .select('chain_id')
      .eq('chain_id', chain_id)
      .single()

    if (chainError || !chain) {
      return NextResponse.json({ 
        success: false, 
        error: '해당 체인을 찾을 수 없습니다.' 
      }, { status: 404 })
    }

    // 브랜드가 존재하는지 확인
    const { data: brand, error: brandError } = await supabase
      .from('hotel_brands')
      .select('brand_id, brand_name_ko, brand_name_en')
      .eq('brand_id', brand_id)
      .single()

    if (brandError || !brand) {
      return NextResponse.json({ 
        success: false, 
        error: '해당 브랜드를 찾을 수 없습니다.' 
      }, { status: 404 })
    }

    // 브랜드 정보에서 체인 정보 가져오기
    const { data: brandInfo, error: brandInfoError } = await supabase
      .from('hotel_brands')
      .select('chain_id')
      .eq('brand_id', brand_id)
      .single()

    if (brandInfoError) {
      console.error('[hotel-connect] brand info error:', brandInfoError)
    }

    // 호텔 정보 업데이트 (브랜드1, 브랜드2, 브랜드3 중 선택된 위치에 설정)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (position === 1) {
      updateData.brand_id = brand_id
      updateData.brand_name_kr = brand.brand_name_ko
      updateData.brand_name_en = brand.brand_name_en
    } else if (position === 2) {
      updateData.brand_id_2 = brand_id
      updateData.brand_name_kr_2 = brand.brand_name_ko
      updateData.brand_name_en_2 = brand.brand_name_en
    } else if (position === 3) {
      updateData.brand_id_3 = brand_id
      updateData.brand_name_kr_3 = brand.brand_name_ko
      updateData.brand_name_en_3 = brand.brand_name_en
    }

    const { data: updatedHotel, error: updateError } = await supabase
      .from('select_hotels')
      .update(updateData)
      .eq('sabre_id', sabre_id)
      .select('*')
      .single()

    if (updateError) {
      console.error('[hotel-connect] update error:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: '호텔 정보 업데이트 중 오류가 발생했습니다.',
        details: updateError.message
      }, { status: 500 })
    }

    console.log('[hotel-connect] success:', {
      sabre_id,
      chain_id,
      brand_id,
      brand_position: position,
      updatedHotel: updatedHotel?.sabre_id,
      brandChainId: brandInfo?.chain_id
    })

    return NextResponse.json({ 
      success: true, 
      data: {
        sabre_id: updatedHotel.sabre_id,
        chain_id: brandInfo?.chain_id || chain_id,
        brand_id: brand_id,
        brand_position: position,
        message: `호텔이 브랜드${position}로 성공적으로 연결되었습니다.`
      }
    }, { status: 200 })

  } catch (error) {
    console.error('[hotel-connect] unexpected error:', error)
    return NextResponse.json({ 
      success: false, 
      error: '예상치 못한 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}
