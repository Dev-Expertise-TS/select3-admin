import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * IHG 체인에 속한 호텔 목록 조회
 * chain_slug가 'ihg'인 체인의 모든 호텔을 반환
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    // chain_slug가 'ihg'인 체인 조회
    const { data: chain, error: chainError } = await supabase
      .from('hotel_chains')
      .select('chain_id, chain_name_ko, chain_name_en, chain_slug')
      .eq('chain_slug', 'ihg')
      .single()

    if (chainError || !chain) {
      console.error('[ihg-hotels] Chain not found:', chainError)
      return NextResponse.json(
        { success: false, error: 'IHG 체인을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 해당 체인에 속한 브랜드 ID 목록 조회
    const { data: brands, error: brandsError } = await supabase
      .from('hotel_brands')
      .select('brand_id')
      .eq('chain_id', chain.chain_id)

    if (brandsError) {
      console.error('[ihg-hotels] Brands error:', brandsError)
      return NextResponse.json(
        { success: false, error: '브랜드 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    const brandIds = (brands || []).map(b => b.brand_id)

    if (brandIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          chain: {
            chain_id: chain.chain_id,
            name_kr: chain.chain_name_ko,
            name_en: chain.chain_name_en,
            slug: chain.chain_slug,
          },
          hotels: [],
          count: 0,
        },
      })
    }

    // brand_id, brand_id_2, brand_id_3 중 하나라도 일치하는 호텔 조회
    // 개별 쿼리 실행 후 병합 (or() 사용 시 안정성 향상)
    const { data: hotels1, error: error1 } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, brand_id, brand_id_2, brand_id_3, rate_plan_code')
      .in('brand_id', brandIds)

    const { data: hotels2, error: error2 } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, brand_id, brand_id_2, brand_id_3, rate_plan_code')
      .in('brand_id_2', brandIds)

    const { data: hotels3, error: error3 } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, brand_id, brand_id_2, brand_id_3, rate_plan_code')
      .in('brand_id_3', brandIds)

    if (error1 || error2 || error3) {
      console.error('[ihg-hotels] Hotels error:', error1 || error2 || error3)
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

    return NextResponse.json({
      success: true,
      data: {
        chain: {
          chain_id: chain.chain_id,
          name_kr: chain.chain_name_ko,
          name_en: chain.chain_name_en,
          slug: chain.chain_slug,
        },
        hotels: (hotels || []).map(hotel => ({
          sabre_id: hotel.sabre_id,
          name_ko: hotel.property_name_ko,
          name_en: hotel.property_name_en,
          brand_id: hotel.brand_id,
          brand_id_2: hotel.brand_id_2,
          brand_id_3: hotel.brand_id_3,
          rate_plan_code: hotel.rate_plan_code,
        })),
        count: hotels?.length || 0,
      },
    })
  } catch (error) {
    console.error('[ihg-hotels] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
