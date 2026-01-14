import { NextRequest, NextResponse } from 'next/server'
import { updateHotelRow, replaceBenefitMappings } from '@/features/hotels/lib/repository'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const sabreId = (formData.get('sabre_id') as string | null) ?? null
    const sabreIdEditable = (formData.get('sabre_id_editable') as string | null)?.trim() || null
    const property_name_ko = (formData.get('property_name_ko') as string | null) ?? null
    const property_name_en = (formData.get('property_name_en') as string | null) ?? null
    const property_address = (formData.get('property_address') as string | null) ?? null
    const city_ko = (formData.get('city_ko') as string | null) ?? null
    const city_en = (formData.get('city_en') as string | null) ?? null
    const country_ko = (formData.get('country_ko') as string | null) ?? null
    const country_en = (formData.get('country_en') as string | null) ?? null
    const continent_ko = (formData.get('continent_ko') as string | null) ?? null
    const continent_en = (formData.get('continent_en') as string | null) ?? null
    const ratePlanCodesRaw = (formData.get('rate_plan_codes') as string | null) ?? ''
    const ratePlanCodesParsed = ratePlanCodesRaw ? ratePlanCodesRaw.split(',').map((s) => s.trim()).filter(Boolean) : []
    const rate_code = ratePlanCodesParsed.length > 0 ? ratePlanCodesParsed.join(', ') : null
    
    // 브랜드1, 브랜드2, 브랜드3 정보 처리
    const brand_id_raw = formData.get('brand_id') as string | null
    const brand_id = brand_id_raw && brand_id_raw.trim() !== '' ? (Number(brand_id_raw) || null) : null
    
    const brand_id_2_raw = formData.get('brand_id_2') as string | null
    const brand_id_2 = brand_id_2_raw && brand_id_2_raw.trim() !== '' ? (Number(brand_id_2_raw) || null) : null
    
    const brand_id_3_raw = formData.get('brand_id_3') as string | null
    const brand_id_3 = brand_id_3_raw && brand_id_3_raw.trim() !== '' ? (Number(brand_id_3_raw) || null) : null
    
    console.log('[hotel/update] 브랜드 ID 파싱:', { brand_id, brand_id_2, brand_id_3, brand_id_raw, brand_id_2_raw, brand_id_3_raw })

    // 브랜드 이름 조회를 위해 Supabase 클라이언트 생성
    const { createServiceRoleClient } = await import('@/lib/supabase/server')
    const supabase = createServiceRoleClient()
    
    // 브랜드 정보 조회 (brand_name도 함께 업데이트하기 위해)
    const brandIds = [brand_id, brand_id_2, brand_id_3].filter(Boolean) as number[]
    let brandMap = new Map<number, { brand_name_ko: string | null; brand_name_en: string | null }>()

    if (brandIds.length > 0) {
      const { data: brands } = await supabase
        .from('hotel_brands')
        .select('brand_id, brand_name_ko, brand_name_en')
        .in('brand_id', brandIds)

      if (brands) {
        brands.forEach(brand => {
          brandMap.set(brand.brand_id, {
            brand_name_ko: brand.brand_name_ko,
            brand_name_en: brand.brand_name_en
          })
        })
      }
    }

    // 호텔 기본 정보 업데이트 데이터 준비
    const hotelUpdateData: Record<string, unknown> = { 
      property_name_ko, 
      property_name_en,
      property_address,
      city_ko,
      city_en,
      country_ko,
      country_en,
      continent_ko,
      continent_en,
      rate_code, 
      sabre_id: sabreIdEditable
    }
    
    // 브랜드1, 브랜드2, 브랜드3 추가 (ID와 이름 모두)
    hotelUpdateData.brand_id = brand_id
    if (brand_id && brandMap.has(brand_id)) {
      const brand = brandMap.get(brand_id)!
      hotelUpdateData.brand_name_kr = brand.brand_name_ko
      hotelUpdateData.brand_name_en = brand.brand_name_en
    } else if (!brand_id) {
      hotelUpdateData.brand_name_kr = null
      hotelUpdateData.brand_name_en = null
    }
    
    hotelUpdateData.brand_id_2 = brand_id_2
    if (brand_id_2 && brandMap.has(brand_id_2)) {
      const brand = brandMap.get(brand_id_2)!
      hotelUpdateData.brand_name_kr_2 = brand.brand_name_ko
      hotelUpdateData.brand_name_en_2 = brand.brand_name_en
    } else if (!brand_id_2) {
      hotelUpdateData.brand_name_kr_2 = null
      hotelUpdateData.brand_name_en_2 = null
    }
    
    hotelUpdateData.brand_id_3 = brand_id_3
    if (brand_id_3 && brandMap.has(brand_id_3)) {
      const brand = brandMap.get(brand_id_3)!
      hotelUpdateData.brand_name_kr_3 = brand.brand_name_ko
      hotelUpdateData.brand_name_en_3 = brand.brand_name_en
    } else if (!brand_id_3) {
      hotelUpdateData.brand_name_kr_3 = null
      hotelUpdateData.brand_name_en_3 = null
    }

    // 호텔 정보 업데이트
    const result = await updateHotelRow({ sabreId, paragonId: null }, hotelUpdateData)
    
    if (result.error) {
      console.error('호텔 업데이트 오류:', result.error)
      return NextResponse.json(
        { success: false, error: `호텔 정보 저장 중 오류가 발생했습니다: ${result.error.message}` },
        { status: 500 }
      )
    }

    // 혜택 매핑 업데이트 (브랜드 변경 시)
    const mappedIds = formData.getAll('mapped_benefit_id').map((v) => String(v))
    if (mappedIds && mappedIds.length > 0) {
      const mappedSortPairs: Array<{ id: string; sort: number }> = mappedIds.map((id, idx) => {
        const key = `mapped_sort__${id}`
        const raw = formData.get(key) as string | null
        const sort = raw != null ? Number(raw) : idx
        return { id, sort: Number.isFinite(sort) ? sort : idx }
      })
      
      const targetSabreId = sabreIdEditable || sabreId || null
      if (targetSabreId) {
        const uniqueIds = Array.from(new Set(mappedIds.map(String)))
        const sortMap = new Map(mappedSortPairs.map((p) => [p.id, p.sort]))
        await replaceBenefitMappings({ originalSabreId: sabreId, targetSabreId, mappedIds: uniqueIds, sortMap })
      }
    }

    // 성공 응답 (brand_id, brand_id_2, brand_id_3 포함)
    return NextResponse.json({
      success: true,
      data: {
        sabre_id: sabreIdEditable || sabreId,
        brand_id,
        brand_id_2,
        brand_id_3
      },
      message: '호텔 정보가 성공적으로 저장되었습니다.'
    })

  } catch (error) {
    console.error('호텔 업데이트 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
