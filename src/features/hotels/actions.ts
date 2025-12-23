'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { normalizeSlug } from '@/lib/media-naming'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * 호텔 정보 업데이트 또는 생성
 */
export async function updateHotel(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const sabreId = formData.get('sabre_id') as string
    const sabreIdEditable = formData.get('sabre_id_editable') as string
    const isNew = formData.get('is_new') === 'true'

    const duplicateSabreIdMessage =
      '동일한 Sabre ID가 이미 존재 합니다. 해당 아이디로 검색 후 호텔 정보 수정을 해주세요'

    console.log('[updateHotel] FormData 수신:', {
      sabreId,
      sabreIdEditable,
      isNew,
    })

    if (!sabreId && !sabreIdEditable) {
      return {
        success: false,
        error: 'Sabre ID는 필수입니다.',
      }
    }

    const targetSabreId = sabreIdEditable || sabreId
    
    console.log('[updateHotel] 대상 Sabre ID:', targetSabreId, '원본 Sabre ID:', sabreId)

    // 신규 호텔 생성 시 sabre_id 중복 방지
    if (isNew) {
      const { data: existingHotel, error: existingError } = await supabase
        .from('select_hotels')
        .select('sabre_id')
        .eq('sabre_id', targetSabreId)
        .maybeSingle()

      if (existingError) {
        console.error('[updateHotel] sabre_id 중복 확인 오류:', existingError)
        return {
          success: false,
          error: 'Sabre ID 중복 확인 중 오류가 발생했습니다.',
        }
      }

      if (existingHotel) {
        return {
          success: false,
          error: duplicateSabreIdMessage,
        }
      }
    }

    // FormData에서 필드 추출
    const updateData: Record<string, unknown> = {}

    // 기본 정보
    const propertyNameKo = formData.get('property_name_ko') as string
    const propertyNameEn = formData.get('property_name_en') as string
    const slug = formData.get('slug') as string
    const publish = formData.get('publish') as string
    const propertyAddress = formData.get('property_address') as string
    const hotelArea = formData.get('hotel_area') as string
    const cityKo = formData.get('city_ko') as string
    const cityEn = formData.get('city_en') as string
    const cityCode = formData.get('city_code') as string
    const countryKo = formData.get('country_ko') as string
    const countryEn = formData.get('country_en') as string
    const countryCode = formData.get('country_code') as string
    const continentKo = formData.get('continent_ko') as string
    const continentEn = formData.get('continent_en') as string
    const continentCode = formData.get('continent_code') as string
    const regionKo = formData.get('region_ko') as string
    const regionEn = formData.get('region_en') as string
    const regionCode = formData.get('region_code') as string
    
    // 신규 생성 시 필수 필드 추가
    if (isNew) {
      updateData.sabre_id = targetSabreId
      if (!propertyNameKo || !propertyNameEn) {
        return {
          success: false,
          error: '호텔명(한글)과 호텔명(영문)은 필수입니다.',
        }
      }
      updateData.property_name_ko = propertyNameKo
      updateData.property_name_en = propertyNameEn
      
      // Slug 처리 (비어있으면 자동 생성)
      if (slug && slug.trim()) {
        updateData.slug = normalizeSlug(slug.trim())
      } else {
        // 영문 호텔명으로 slug 자동 생성
        updateData.slug = normalizeSlug(propertyNameEn)
      }
    } else {
      // 기존 호텔 업데이트 시
      if (propertyNameKo !== undefined) updateData.property_name_ko = propertyNameKo || null
      if (propertyNameEn !== undefined) updateData.property_name_en = propertyNameEn || null
      if (slug !== undefined) {
        updateData.slug = slug && slug.trim() ? normalizeSlug(slug.trim()) : null
      }
    }
    
    // Publish 상태 처리
    if (publish !== undefined && publish !== null) {
      updateData.publish = publish === 'true' || publish === true
    }
    
    if (propertyAddress) updateData.property_address = propertyAddress
    if (hotelArea !== undefined) updateData.hotel_area = hotelArea || null
    if (cityKo !== undefined) updateData.city_ko = cityKo || null
    if (cityEn !== undefined) updateData.city_en = cityEn || null
    if (cityCode !== undefined) updateData.city_code = cityCode || null
    if (countryKo !== undefined) updateData.country_ko = countryKo || null
    if (countryEn !== undefined) updateData.country_en = countryEn || null
    if (countryCode !== undefined) updateData.country_code = countryCode || null
    if (continentKo !== undefined) updateData.continent_ko = continentKo || null
    if (continentEn !== undefined) updateData.continent_en = continentEn || null
    if (continentCode !== undefined) updateData.continent_code = continentCode || null
    if (regionKo !== undefined) updateData.region_ko = regionKo || null
    if (regionEn !== undefined) updateData.region_en = regionEn || null
    if (regionCode !== undefined) updateData.region_code = regionCode || null

    // 브랜드 정보만 업데이트 (chain_id는 select_hotels 테이블에 없음)
    const brandId = formData.get('brand_id') as string
    
    if (brandId) {
      updateData.brand_id = brandId === '' ? null : Number(brandId)
    }

    // Rate Plan Codes (rate_plan_code 컬럼에 저장)
    const ratePlanCodes = formData.get('rate_plan_codes') as string
    if (ratePlanCodes !== undefined) {
      try {
        const parsed = JSON.parse(ratePlanCodes)
        updateData.rate_plan_code = Array.isArray(parsed) && parsed.length > 0 ? parsed.join(',') : null
      } catch {
        updateData.rate_plan_code = null
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

    // 이미지 URL들
    for (let i = 1; i <= 5; i++) {
      const imageKey = `image_${i}`
      const imageValue = formData.get(imageKey) as string
      if (imageValue !== null) {
        updateData[imageKey] = imageValue || null
      }
    }

    // DB 업데이트 또는 생성
    if (isNew) {
      // 신규 호텔 생성
      const { error } = await supabase
        .from('select_hotels')
        .insert(updateData)

      if (error) {
        console.error('호텔 생성 오류:', error)
        const err = error as { code?: string; message?: string }
        const isUniqueViolation = err.code === '23505'
        const message = (err.message || '').toLowerCase()
        const isSabreIdConflict =
          isUniqueViolation && (message.includes('sabre_id') || message.includes('sabre id'))

        if (isSabreIdConflict) {
          return {
            success: false,
            error: duplicateSabreIdMessage,
          }
        }
        return {
          success: false,
          error: `호텔 생성에 실패했습니다: ${error.message}`,
        }
      }
    } else {
      // 기존 호텔 업데이트
      console.log('[updateHotel] 기존 호텔 업데이트 모드')
      console.log('[updateHotel] updateData:', updateData)
      
      // Sabre ID 변경 시 특별 처리 (Primary Key 변경)
      if (targetSabreId !== sabreId) {
        console.log(`[updateHotel] Sabre ID 변경 감지: ${sabreId} → ${targetSabreId}`)
        
        // 1. 기존 호텔 데이터 전체 조회
        const { data: existingHotel, error: fetchError } = await supabase
          .from('select_hotels')
          .select('*')
          .eq('sabre_id', sabreId)
          .single()

        if (fetchError || !existingHotel) {
          return {
            success: false,
            error: '기존 호텔 정보를 찾을 수 없습니다.',
          }
        }

        // 2. 관련 데이터 조회 (삭제 전에 미리 조회)
        const { data: benefitMappings } = await supabase
          .from('select_hotel_benefits_map')
          .select('*')
          .eq('sabre_id', sabreId)

        const { data: mediaRecords } = await supabase
          .from('select_hotel_media')
          .select('*')
          .eq('sabre_id', sabreId)

        console.log('[updateHotel] 마이그레이션할 데이터:', {
          benefits: benefitMappings?.length || 0,
          media: mediaRecords?.length || 0,
        })

        // 3. 기존 레코드 삭제 (새 레코드 생성 전에 먼저 삭제)
        console.log('[updateHotel] 기존 호텔 레코드 삭제:', sabreId)
        const { error: deleteError } = await supabase
          .from('select_hotels')
          .delete()
          .eq('sabre_id', sabreId)

        if (deleteError) {
          console.error('[updateHotel] 기존 호텔 삭제 오류:', deleteError)
          return {
            success: false,
            error: `기존 호텔 삭제에 실패했습니다: ${deleteError.message}`,
          }
        }

        // 4. 새로운 Sabre ID로 레코드 생성 (기존 데이터 + 변경사항)
        const newHotelData = {
          ...existingHotel,
          ...updateData,
          sabre_id: targetSabreId,
        }
        
        // id, created_at, updated_at 제거 (자동 생성)
        delete newHotelData.id
        delete newHotelData.created_at
        delete newHotelData.updated_at

        console.log('[updateHotel] 새 호텔 레코드 생성:', targetSabreId)
        const { error: insertError } = await supabase
          .from('select_hotels')
          .insert(newHotelData)

        if (insertError) {
          console.error('[updateHotel] 새 Sabre ID로 호텔 생성 오류:', insertError)
          return {
            success: false,
            error: `새 Sabre ID로 호텔 생성에 실패했습니다: ${insertError.message}`,
          }
        }

        // 5. 관련 데이터 마이그레이션 (benefits mapping)
        if (benefitMappings && benefitMappings.length > 0) {
          console.log('[updateHotel] 혜택 매핑 마이그레이션:', benefitMappings.length, '개')
          const newMappings = benefitMappings.map(m => ({
            sabre_id: targetSabreId,
            benefit_id: m.benefit_id,
            sort: m.sort,
          }))

          await supabase
            .from('select_hotel_benefits_map')
            .insert(newMappings)
        }

        // 6. 관련 데이터 마이그레이션 (media)
        if (mediaRecords && mediaRecords.length > 0) {
          console.log('[updateHotel] 이미지 레코드 마이그레이션:', mediaRecords.length, '개')
          const newMediaRecords = mediaRecords.map(m => ({
            sabre_id: targetSabreId,
            file_name: m.file_name,
            file_path: m.file_path,
            storage_path: m.storage_path,
            public_url: m.public_url,
            file_type: m.file_type,
            file_size: m.file_size,
            slug: m.slug,
            image_seq: m.image_seq,
            original_url: m.original_url,
          }))

          await supabase
            .from('select_hotel_media')
            .insert(newMediaRecords)
        }

        console.log(`[updateHotel] Sabre ID 변경 완료: ${sabreId} → ${targetSabreId}`)
      } else {
        // Sabre ID 변경 없이 일반 업데이트
        console.log('[updateHotel] 일반 업데이트 실행, sabre_id:', targetSabreId)
        console.log('[updateHotel] 업데이트할 데이터:', updateData)
        
        const { error } = await supabase
          .from('select_hotels')
          .update(updateData)
          .eq('sabre_id', targetSabreId)

        if (error) {
          console.error('[updateHotel] 호텔 업데이트 오류:', error)
          return {
            success: false,
            error: `호텔 업데이트에 실패했습니다: ${error.message}`,
          }
        }
        
        console.log('[updateHotel] 업데이트 성공')
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

    // slug 자동 생성: 영문명이 있으면 영문명 → slug, 없으면 한글명 → slug 시도
    let slugCandidate = ''
    if (propertyNameEn) slugCandidate = normalizeSlug(propertyNameEn)
    if (!slugCandidate && propertyNameKo) slugCandidate = normalizeSlug(propertyNameKo)
    if (!slugCandidate) slugCandidate = `hotel-${sabreId}`

    const hotelData: Record<string, unknown> = {
      sabre_id: sabreId,
      property_name_ko: propertyNameKo,
      property_name_en: propertyNameEn,
      slug: slugCandidate,
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

    let { data, error } = await supabase
      .from('select_hotels')
      .insert(hotelData)
      .select()
      .single()

    if (error) {
      // slug 유니크 충돌 시 sabreId를 suffix로 붙여 재시도
      const isUniqueViolation = (error as { code?: string; message?: string }).code === '23505'
      const message = (error as { message?: string }).message || ''
      const isSlugConflict = isUniqueViolation && message.toLowerCase().includes('slug')
      if (isSlugConflict) {
        const retryData = { ...hotelData, slug: `${String(hotelData.slug)}-${sabreId}` }
        const retry = await supabase
          .from('select_hotels')
          .insert(retryData)
          .select()
          .single()
        if (retry.error) {
          console.error('호텔 생성 오류(재시도 실패):', retry.error)
          return {
            success: false,
            error: `호텔 생성에 실패했습니다: ${retry.error.message}`,
          }
        }
        data = retry.data
      } else {
        console.error('호텔 생성 오류:', error)
        return {
          success: false,
          error: `호텔 생성에 실패했습니다: ${error.message}`,
        }
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
        rate_plan_code: ratePlanCodes.length > 0 ? ratePlanCodes : null 
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

