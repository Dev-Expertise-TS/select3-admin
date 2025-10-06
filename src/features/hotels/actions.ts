'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * 호텔 정보 업데이트
 */
export async function updateHotel(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const sabreId = formData.get('sabre_id') as string
    const sabreIdEditable = formData.get('sabre_id_editable') as string

    if (!sabreId && !sabreIdEditable) {
      return {
        success: false,
        error: 'Sabre ID는 필수입니다.',
      }
    }

    const targetSabreId = sabreIdEditable || sabreId

    // FormData에서 필드 추출
    const updateData: Record<string, unknown> = {}

    // 기본 정보
    const propertyNameKo = formData.get('property_name_ko') as string
    const propertyNameEn = formData.get('property_name_en') as string
    const propertyAddress = formData.get('property_address') as string
    const cityKo = formData.get('city_ko') as string
    const cityEn = formData.get('city_en') as string
    const countryKo = formData.get('country_ko') as string
    const countryEn = formData.get('country_en') as string
    const continentKo = formData.get('continent_ko') as string
    const continentEn = formData.get('continent_en') as string
    
    if (propertyNameKo) updateData.property_name_ko = propertyNameKo
    if (propertyNameEn) updateData.property_name_en = propertyNameEn
    if (propertyAddress) updateData.property_address = propertyAddress
    if (cityKo) updateData.city_ko = cityKo
    if (cityEn) updateData.city_en = cityEn
    if (countryKo) updateData.country_ko = countryKo
    if (countryEn) updateData.country_en = countryEn
    if (continentKo) updateData.continent_ko = continentKo
    if (continentEn) updateData.continent_en = continentEn

    // 체인/브랜드 정보
    const chainId = formData.get('chain_id') as string
    const brandId = formData.get('brand_id') as string
    
    if (chainId) {
      updateData.chain_id = chainId === '' ? null : Number(chainId)
    }
    if (brandId) {
      updateData.brand_id = brandId === '' ? null : Number(brandId)
    }

    // Rate Plan Codes
    const ratePlanCodes = formData.get('rate_plan_codes') as string
    if (ratePlanCodes !== undefined) {
      try {
        const parsed = JSON.parse(ratePlanCodes)
        updateData.rate_plan_codes = Array.isArray(parsed) && parsed.length > 0 ? parsed : null
      } catch {
        updateData.rate_plan_codes = null
      }
    }

    // 호텔 콘텐츠 필드
    const propertyDetails = formData.get('property_details') as string
    const propertyLocation = formData.get('property_location') as string
    const propertyRooms = formData.get('property_rooms') as string
    const propertyDining = formData.get('property_dining') as string
    const propertyAmenities = formData.get('property_amenities') as string
    const propertyBusiness = formData.get('property_business') as string
    const propertyRecreation = formData.get('property_recreation') as string
    const propertyFamily = formData.get('property_family') as string
    
    if (propertyDetails !== null) updateData.property_details = propertyDetails || null
    if (propertyLocation !== null) updateData.property_location = propertyLocation || null
    if (propertyRooms !== null) updateData.property_rooms = propertyRooms || null
    if (propertyDining !== null) updateData.property_dining = propertyDining || null
    if (propertyAmenities !== null) updateData.property_amenities = propertyAmenities || null
    if (propertyBusiness !== null) updateData.property_business = propertyBusiness || null
    if (propertyRecreation !== null) updateData.property_recreation = propertyRecreation || null
    if (propertyFamily !== null) updateData.property_family = propertyFamily || null

    // 슬러그
    const slug = formData.get('slug') as string
    if (slug) updateData.slug = slug

    // 이미지 URL들
    for (let i = 1; i <= 5; i++) {
      const imageKey = `image_${i}`
      const imageValue = formData.get(imageKey) as string
      if (imageValue !== null) {
        updateData[imageKey] = imageValue || null
      }
    }

    // DB 업데이트
    const { error } = await supabase
      .from('select_hotels')
      .update(updateData)
      .eq('sabre_id', targetSabreId)

    if (error) {
      console.error('호텔 업데이트 오류:', error)
      return {
        success: false,
        error: `호텔 업데이트에 실패했습니다: ${error.message}`,
      }
    }

    // 캐시 무효화
    revalidatePath('/admin/hotel-update')
    revalidatePath(`/admin/hotel-update/${targetSabreId}`)
    revalidatePath('/admin/hotel-search')

    return {
      success: true,
      data: { sabre_id: targetSabreId },
    }
  } catch (error) {
    console.error('호텔 업데이트 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

/**
 * 호텔 생성
 */
export async function createHotel(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const sabreId = formData.get('sabre_id') as string
    const propertyNameKo = formData.get('property_name_ko') as string
    const propertyNameEn = formData.get('property_name_en') as string

    if (!sabreId || !propertyNameKo || !propertyNameEn) {
      return {
        success: false,
        error: 'Sabre ID, 한글명, 영문명은 필수입니다.',
      }
    }

    const hotelData: Record<string, unknown> = {
      sabre_id: sabreId,
      property_name_ko: propertyNameKo,
      property_name_en: propertyNameEn,
    }

    // 선택적 필드
    const optionalFields = [
      'property_address', 'city_ko', 'city_en', 'country_ko', 'country_en',
      'continent_ko', 'continent_en', 'chain_id', 'brand_id', 'slug',
      'property_details', 'property_location', 'property_rooms',
      'property_dining', 'property_amenities', 'property_business',
      'property_recreation', 'property_family',
      'image_1', 'image_2', 'image_3', 'image_4', 'image_5'
    ]

    optionalFields.forEach(field => {
      const value = formData.get(field) as string
      if (value) {
        if (field === 'chain_id' || field === 'brand_id') {
          hotelData[field] = value === '' ? null : Number(value)
        } else {
          hotelData[field] = value
        }
      }
    })

    const { data, error } = await supabase
      .from('select_hotels')
      .insert(hotelData)
      .select()
      .single()

    if (error) {
      console.error('호텔 생성 오류:', error)
      return {
        success: false,
        error: `호텔 생성에 실패했습니다: ${error.message}`,
      }
    }

    revalidatePath('/admin/hotel-search')
    revalidatePath('/admin/hotel-update')

    return {
      success: true,
      data: { hotel: data },
    }
  } catch (error) {
    console.error('호텔 생성 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

/**
 * Rate Plan Codes 업데이트
 */
export async function updateRatePlanCodes(
  sabreId: string,
  ratePlanCodes: string[]
): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('select_hotels')
      .update({ 
        rate_plan_codes: ratePlanCodes.length > 0 ? ratePlanCodes : null 
      })
      .eq('sabre_id', sabreId)

    if (error) {
      console.error('Rate Plan Codes 업데이트 오류:', error)
      return {
        success: false,
        error: `업데이트에 실패했습니다: ${error.message}`,
      }
    }

    revalidatePath(`/admin/hotel-update/${sabreId}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Rate Plan Codes 업데이트 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

