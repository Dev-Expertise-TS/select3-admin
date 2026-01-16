'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ChainFormData = {
  chain_id?: number
  name_kr?: string | null
  name_en?: string | null
  chain_slug?: string | null
  chain_sort_order?: number | null
  status?: string | null
}

export type BrandFormData = {
  brand_id?: number
  name_kr?: string | null
  name_en?: string | null
  brand_slug?: string | null
  chain_id?: number | null
  brand_sort_order?: number | null
  status?: string | null
}

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

// Chain Actions
export async function saveChain(formData: FormData): Promise<ActionResult<ChainFormData>> {
  const supabase = createServiceRoleClient()

  const chainId = formData.get('chain_id') ? Number(formData.get('chain_id')) : undefined
  const nameKr = formData.get('name_kr') as string || null
  const nameEn = formData.get('name_en') as string || null
  const chainSlug = formData.get('chain_slug') as string || null
  const status = ((formData.get('status') as string) || 'active').trim()
  
  console.log('[chain-brand] saveChain input:', { chainId, nameKr, nameEn, chainSlug, status })
  
  // hotel_chains 테이블의 실제 컬럼명 사용
  const chainData: Record<string, unknown> = {
    chain_name_ko: nameKr,
    chain_name_en: nameEn,
    chain_slug: chainSlug,
    status: status,
  }

  console.log('[chain-brand] saveChain payload:', chainData)

  let query;
  if (chainId) {
    query = supabase
      .from('hotel_chains')
      .update(chainData)
      .eq('chain_id', chainId)
  } else {
    query = supabase.from('hotel_chains').insert(chainData)
  }

  const { data, error } = await query.select().single()

  if (error) {
    console.error('[chain-brand] saveChain error:', error)
    return { success: false, error: error.message }
  }

  console.log('[chain-brand] saveChain success, returned data:', data)

  // DB 컬럼명을 클라이언트 형식으로 변환
  const dbData = data as Record<string, unknown>
  const mappedData: ChainFormData = {
    chain_id: dbData.chain_id as number,
    name_kr: (dbData.chain_name_ko as string) || null,
    name_en: (dbData.chain_name_en as string) || null,
    chain_slug: (dbData.chain_slug as string) || null,
    chain_sort_order: (dbData.chain_sort_order as number) || null,
    status: ((dbData.status as string) || 'active').trim()
  }

  revalidatePath('/admin/chain-brand')
  return { success: true, data: mappedData }
}

export async function createChain(formData: FormData): Promise<ActionResult<ChainFormData>> {
  const supabase = createServiceRoleClient()

  const nameKr = formData.get('name_kr') as string || null
  const nameEn = formData.get('name_en') as string || null
  const chainSlug = formData.get('chain_slug') as string || null
  const status = ((formData.get('status') as string) || 'active').trim()
  
  // hotel_chains 테이블의 실제 컬럼명 사용
  const chainData: Record<string, unknown> = {
    chain_name_ko: nameKr,
    chain_name_en: nameEn,
    chain_slug: chainSlug,
    status: status,
  }

  const { data, error } = await supabase
    .from('hotel_chains')
    .insert(chainData)
    .select()
    .single()

  if (error) {
    console.error('Error creating chain:', error)
    return { success: false, error: error.message }
  }

  // DB 컬럼명을 클라이언트 형식으로 변환
  const dbData = data as Record<string, unknown>
  const mappedData: ChainFormData = {
    chain_id: dbData.chain_id as number,
    name_kr: (dbData.chain_name_ko as string) || null,
    name_en: (dbData.chain_name_en as string) || null,
    chain_slug: (dbData.chain_slug as string) || null,
    chain_sort_order: (dbData.chain_sort_order as number) || null,
    status: ((dbData.status as string) || 'active').trim()
  }

  revalidatePath('/admin/chain-brand')
  return { success: true, data: mappedData }
}

export async function deleteChain(chainId: number): Promise<ActionResult> {
  const supabase = createServiceRoleClient()

  // 먼저 해당 체인에 연결된 브랜드가 있는지 확인
  const { data: relatedBrands, error: checkError } = await supabase
    .from('hotel_brands')
    .select('brand_id, brand_name_ko, brand_name_en')
    .eq('chain_id', chainId)

  if (checkError) {
    console.error('[chain-brand] deleteChain check error:', checkError)
    return { success: false, error: '체인 삭제 가능 여부를 확인하는 중 오류가 발생했습니다.' }
  }

  // 연결된 브랜드가 있으면 삭제 거부
  if (relatedBrands && relatedBrands.length > 0) {
    const brandNames = relatedBrands.map(b => b.brand_name_ko || b.brand_name_en || `ID: ${b.brand_id}`).join(', ')
    return { 
      success: false, 
      error: `이 체인에 연결된 브랜드가 ${relatedBrands.length}개 있습니다. 먼저 다음 브랜드들을 삭제하거나 다른 체인으로 변경해주세요: ${brandNames}` 
    }
  }

  // 체인에 연결된 호텔이 있는지도 확인 (브랜드를 통해)
  const { data: relatedHotels, error: hotelCheckError } = await supabase
    .from('select_hotels')
    .select('sabre_id')
    .not('brand_id', 'is', null)

  if (!hotelCheckError && relatedHotels && relatedHotels.length > 0) {
    // 이 호텔들의 brand_id가 이 체인의 브랜드인지 확인
    const { data: chainBrands } = await supabase
      .from('hotel_brands')
      .select('brand_id')
      .eq('chain_id', chainId)
    
    const chainBrandIds = (chainBrands || []).map(b => b.brand_id)
    
    const { data: connectedHotels } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en')
      .in('brand_id', chainBrandIds)
      .limit(5)

    if (connectedHotels && connectedHotels.length > 0) {
      const hotelNames = connectedHotels.map(h => h.property_name_ko || h.property_name_en || h.sabre_id).join(', ')
      const moreText = connectedHotels.length >= 5 ? ' 등' : ''
      return {
        success: false,
        error: `이 체인의 브랜드에 연결된 호텔이 있습니다. 먼저 호텔 연결을 해제해주세요. 예: ${hotelNames}${moreText}`
      }
    }
  }

  // 연결된 브랜드/호텔이 없으면 체인 삭제
  const { error } = await supabase
    .from('hotel_chains')
    .delete()
    .eq('chain_id', chainId)

  if (error) {
    console.error('[chain-brand] deleteChain error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/chain-brand')
  return { success: true }
}

// Brand Actions
export async function saveBrand(formData: FormData): Promise<ActionResult<BrandFormData>> {
  const supabase = createServiceRoleClient()

  const brandId = formData.get('brand_id') ? Number(formData.get('brand_id')) : undefined
  // Prefer canonical columns; fallback to legacy brand_name_* if DB schema differs
  const nameKo = (formData.get('name_kr') as string) ?? (formData.get('brand_name_ko') as string) ?? null
  const nameEn = (formData.get('name_en') as string) ?? (formData.get('brand_name_en') as string) ?? null
  const brandSlug = (formData.get('brand_slug') as string) || null
  const status = ((formData.get('status') as string) || 'active').trim()
  const chainId = formData.get('chain_id') ? Number(formData.get('chain_id')) : null
  
  console.log('[chain-brand] saveBrand input:', { brandId, nameKo, nameEn, brandSlug, chainId, status })
  
  const brandData: Record<string, unknown> = {
    brand_name_ko: nameKo || null,
    brand_name_en: nameEn || null,
    brand_slug: brandSlug,
    chain_id: chainId,
    status: status,
  }

  console.log('[chain-brand] saveBrand payload:', brandData)

  let query;
  if (brandId) {
    query = supabase
      .from('hotel_brands')
      .update(brandData)
      .eq('brand_id', brandId)
  } else {
    query = supabase.from('hotel_brands').insert(brandData)
  }

  const { data: initialData, error } = await query.select().single()
  let data = initialData

  if (error) {
    // Retry once with legacy column names if column mismatch occurs
    const message = String(error.message || '')
    const needsLegacy = message.includes("'name_en'") || message.includes("'name_kr'")
    if (needsLegacy) {
      const legacyBrandData: Record<string, unknown> = {
        name_kr: nameKo || null,
        name_en: nameEn || null,
        chain_id: formData.get('chain_id') ? Number(formData.get('chain_id')) : null,
      }
      if (brandId) {
        const retryResult = await supabase
          .from('hotel_brands')
          .update(legacyBrandData)
          .eq('brand_id', brandId)
          .select()
          .single()
        if (retryResult.error) {
          console.error('Error saving brand (legacy retry failed):', retryResult.error)
          return { success: false, error: retryResult.error.message }
        }
        data = retryResult.data
      } else {
        const retryResult = await supabase
          .from('hotel_brands')
          .insert(legacyBrandData)
          .select()
          .single()
        if (retryResult.error) {
          console.error('Error saving brand (legacy retry failed):', retryResult.error)
          return { success: false, error: retryResult.error.message }
        }
        data = retryResult.data
      }
    } else {
      console.error('[chain-brand] saveBrand final error:', error)
      return { success: false, error: error.message }
    }
  }

  console.log('[chain-brand] saveBrand success, returned data:', data)

  // DB 컬럼명을 클라이언트 형식으로 변환
  const dbData = data as Record<string, unknown>
  const mappedData: BrandFormData = {
    brand_id: dbData.brand_id as number,
    name_kr: (dbData.brand_name_ko as string) || null,
    name_en: (dbData.brand_name_en as string) || null,
    brand_slug: (dbData.brand_slug as string) || null,
    chain_id: (dbData.chain_id as number) || null,
    brand_sort_order: (dbData.brand_sort_order as number) || null,
    status: ((dbData.status as string) || 'active').trim()
  }

  revalidatePath('/admin/chain-brand')
  return { success: true, data: mappedData }
}

export async function createBrand(formData: FormData): Promise<ActionResult<BrandFormData>> {
  const supabase = createServiceRoleClient()

  const nameKo = (formData.get('name_kr') as string) ?? (formData.get('brand_name_ko') as string) ?? null
  const nameEn = (formData.get('name_en') as string) ?? (formData.get('brand_name_en') as string) ?? null
  const brandSlug = (formData.get('brand_slug') as string) || null
  const status = ((formData.get('status') as string) || 'active').trim()
  const brandData: Record<string, unknown> = {
    brand_name_ko: nameKo || null,
    brand_name_en: nameEn || null,
    brand_slug: brandSlug,
    chain_id: formData.get('chain_id') ? Number(formData.get('chain_id')) : null,
    status: status,
  }

  const { data: initialData, error } = await supabase
    .from('hotel_brands')
    .insert(brandData)
    .select()
    .single()
  let data = initialData

  if (error) {
    const message = String(error.message || '')
    const needsLegacy = message.includes("'name_en'") || message.includes("'name_kr'")
    if (needsLegacy) {
      const legacyBrandData: Record<string, unknown> = {
        name_kr: nameKo || null,
        name_en: nameEn || null,
        brand_slug: brandSlug,
        chain_id: formData.get('chain_id') ? Number(formData.get('chain_id')) : null,
        status: status,
      }
      const retryResult = await supabase
        .from('hotel_brands')
        .insert(legacyBrandData)
        .select()
        .single()
      if (retryResult.error) {
        console.error('Error creating brand (legacy retry failed):', retryResult.error)
        return { success: false, error: retryResult.error.message }
      }
      data = retryResult.data
    } else {
      console.error('Error creating brand:', error)
      return { success: false, error: error.message }
    }
  }

  // DB 컬럼명을 클라이언트 형식으로 변환
  const dbData = data as Record<string, unknown>
  const mappedData: BrandFormData = {
    brand_id: dbData.brand_id as number,
    name_kr: (dbData.brand_name_ko as string) || null,
    name_en: (dbData.brand_name_en as string) || null,
    brand_slug: (dbData.brand_slug as string) || null,
    chain_id: (dbData.chain_id as number) || null,
    brand_sort_order: (dbData.brand_sort_order as number) || null,
    status: ((dbData.status as string) || 'active').trim()
  }

  revalidatePath('/admin/chain-brand')
  return { success: true, data: mappedData }
}

export async function deleteBrand(brandId: number): Promise<ActionResult> {
  const supabase = createServiceRoleClient()

  // 먼저 해당 브랜드에 연결된 호텔이 있는지 확인
  const { data: relatedHotels, error: checkError } = await supabase
    .from('select_hotels')
    .select('sabre_id, property_name_ko, property_name_en')
    .eq('brand_id', brandId)
    .limit(10)

  if (checkError) {
    console.error('[chain-brand] deleteBrand check error:', checkError)
    return { success: false, error: '브랜드 삭제 가능 여부를 확인하는 중 오류가 발생했습니다.' }
  }

  // 연결된 호텔이 있으면 삭제 거부
  if (relatedHotels && relatedHotels.length > 0) {
    const hotelNames = relatedHotels.slice(0, 5).map(h => h.property_name_ko || h.property_name_en || h.sabre_id).join(', ')
    const moreText = relatedHotels.length > 5 ? ` 외 ${relatedHotels.length - 5}개` : ''
    return { 
      success: false, 
      error: `이 브랜드에 연결된 호텔이 ${relatedHotels.length}개 있습니다. 먼저 호텔 연결을 해제해주세요. 예: ${hotelNames}${moreText}` 
    }
  }

  // 연결된 호텔이 없으면 브랜드 삭제
  const { error } = await supabase
    .from('hotel_brands')
    .delete()
    .eq('brand_id', brandId)

  if (error) {
    console.error('[chain-brand] deleteBrand error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/chain-brand')
  return { success: true }
}

/**
 * 체인/브랜드 목록 조회
 */
export async function getChainBrandList(company?: string): Promise<ActionResult<{
  chains: Array<{
    chain_id: number
    name_kr: string | null
    name_en: string | null
    slug: string | null
    chain_sort_order: number | null
  }>
  brands: Array<{
    brand_id: number
    chain_id: number | null
    name_kr: string | null
    name_en: string | null
  }>
}>> {
  try {
    const supabase = createServiceRoleClient()
    const filterByVcc = company === 'sk'

    // 체인 데이터 조회
    let chainsQuery = supabase.from('hotel_chains').select('*')
    
    if (filterByVcc) {
      // VCC 컬럼 존재 여부 확인 로직은 단순화하여 시도
      chainsQuery = chainsQuery.eq('vcc', true)
    }

    const { data: chainsData, error: chainsError } = await chainsQuery
      .order('chain_sort_order', { ascending: true, nullsFirst: false })
      .order('chain_id', { ascending: true })

    if (chainsError) {
      console.error('[chain-brand] getChainBrandList chains error:', chainsError)
      return { success: false, error: chainsError.message }
    }

    // 브랜드 데이터 조회
    const { data: brandsData, error: brandsError } = await supabase
      .from('hotel_brands')
      .select('*')
      .order('brand_id', { ascending: true })

    if (brandsError) {
      console.error('[chain-brand] getChainBrandList brands error:', brandsError)
      return { success: false, error: brandsError.message }
    }

    // 컬럼 매핑 ( hotel_chains -> 클라이언트 형식 )
    const chains = (chainsData || []).map(r => ({
      chain_id: Number(r.chain_id),
      name_kr: (r.chain_name_ko as string) || (r.name_kr as string) || null,
      name_en: (r.chain_name_en as string) || (r.name_en as string) || null,
      slug: (r.chain_slug as string) || (r.slug as string) || null,
      chain_sort_order: r.chain_sort_order ? Number(r.chain_sort_order) : null,
    }))

    // 컬럼 매핑 ( hotel_brands -> 클라이언트 형식 )
    const brands = (brandsData || []).map(r => ({
      brand_id: Number(r.brand_id),
      chain_id: r.chain_id ? Number(r.chain_id) : null,
      name_kr: (r.brand_name_ko as string) || (r.name_kr as string) || null,
      name_en: (r.brand_name_en as string) || (r.name_en as string) || null,
    }))

    return { 
      success: true, 
      data: { chains, brands } 
    }
  } catch (e) {
    console.error('[chain-brand] getChainBrandList exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 체인 순서 업데이트
 */
export async function updateChainSortOrder(chainId: number, sortOrder: number): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('hotel_chains')
      .update({ chain_sort_order: sortOrder })
      .eq('chain_id', chainId)

    if (error) {
      console.error('[chain-brand] updateChainSortOrder error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/chain-brand')
    return { success: true }
  } catch (e) {
    console.error('[chain-brand] updateChainSortOrder exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 브랜드 순서 업데이트
 */
export async function updateBrandSortOrder(brandId: number, sortOrder: number): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('hotel_brands')
      .update({ brand_sort_order: sortOrder })
      .eq('brand_id', brandId)

    if (error) {
      console.error('[chain-brand] updateBrandSortOrder error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/chain-brand')
    return { success: true }
  } catch (e) {
    console.error('[chain-brand] updateBrandSortOrder exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 브랜드에 연결된 호텔 목록 조회 (브랜드1, 브랜드2, 브랜드3 모두 포함)
 */
export async function getBrandHotels(brandId: number): Promise<ActionResult<{
  hotels: Array<{
    sabre_id: string
    property_name_ko: string | null
    property_name_en: string | null
    property_address: string | null
    city_ko: string | null
    country_ko: string | null
    brand_position?: 1 | 2 | 3 // 브랜드 위치 정보
  }>
}>> {
  try {
    const supabase = createServiceRoleClient()

    // 브랜드1, 브랜드2, 브랜드3 모두에서 해당 브랜드 ID를 가진 호텔 조회
    const { data: hotels1, error: error1 } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, property_address, city_ko, country_ko')
      .eq('brand_id', brandId)
      .order('property_name_ko', { ascending: true, nullsFirst: false })

    const { data: hotels2, error: error2 } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, property_address, city_ko, country_ko')
      .eq('brand_id_2', brandId)
      .order('property_name_ko', { ascending: true, nullsFirst: false })

    const { data: hotels3, error: error3 } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, property_address, city_ko, country_ko')
      .eq('brand_id_3', brandId)
      .order('property_name_ko', { ascending: true, nullsFirst: false })

    if (error1 || error2 || error3) {
      console.error('[chain-brand] getBrandHotels error:', error1 || error2 || error3)
      return { success: false, error: (error1 || error2 || error3)?.message || '호텔 조회 중 오류가 발생했습니다.' }
    }

    // 디버깅: 조회된 호텔 수 확인
    console.log(`[getBrandHotels] 브랜드 ID ${brandId} 조회 결과:`, {
      brand_id: hotels1?.length || 0,
      brand_id_2: hotels2?.length || 0,
      brand_id_3: hotels3?.length || 0,
      total: (hotels1?.length || 0) + (hotels2?.length || 0) + (hotels3?.length || 0)
    })

    // 중복 제거 및 브랜드 위치 정보 추가
    const hotelMap = new Map<string, { sabre_id: string; property_name_ko: string | null; property_name_en: string | null; property_address: string | null; city_ko: string | null; country_ko: string | null; brand_position?: 1 | 2 | 3 }>()
    
    // 브랜드1 호텔 추가
    hotels1?.forEach(hotel => {
      hotelMap.set(hotel.sabre_id, { ...hotel, brand_position: 1 })
    })
    
    // 브랜드2 호텔 추가 (중복이 아닌 경우만)
    hotels2?.forEach(hotel => {
      const existing = hotelMap.get(hotel.sabre_id)
      if (!existing) {
        // 중복이 아닌 경우에만 추가
        hotelMap.set(hotel.sabre_id, { ...hotel, brand_position: 2 })
      }
    })
    
    // 브랜드3 호텔 추가 (중복이 아닌 경우만)
    hotels3?.forEach(hotel => {
      const existing = hotelMap.get(hotel.sabre_id)
      if (!existing) {
        // 중복이 아닌 경우에만 추가
        hotelMap.set(hotel.sabre_id, { ...hotel, brand_position: 3 })
      }
    })

    const hotels = Array.from(hotelMap.values())
    
    // 디버깅: 최종 결과 확인
    console.log(`[getBrandHotels] 브랜드 ID ${brandId} 최종 결과:`, {
      total: hotels.length,
      brand_position_1: hotels.filter(h => h.brand_position === 1).length,
      brand_position_2: hotels.filter(h => h.brand_position === 2).length,
      brand_position_3: hotels.filter(h => h.brand_position === 3).length
    })

    return { 
      success: true, 
      data: { 
        hotels
      } 
    }
  } catch (e) {
    console.error('[chain-brand] getBrandHotels exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 호텔의 브랜드 연결 해제 (브랜드1, 브랜드2, 브랜드3 중 선택 가능)
 */
export async function disconnectHotelFromBrand(sabreId: string, brandPosition?: 1 | 2 | 3): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    // brandPosition이 지정되지 않은 경우, 모든 브랜드 위치에서 해당 브랜드 ID를 찾아서 해제
    // brandPosition이 지정된 경우, 해당 위치의 브랜드만 해제
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (brandPosition === 1 || brandPosition === undefined) {
      updateData.brand_id = null
      updateData.brand_name_kr = null
      updateData.brand_name_en = null
    }
    
    if (brandPosition === 2 || brandPosition === undefined) {
      updateData.brand_id_2 = null
      updateData.brand_name_kr_2 = null
      updateData.brand_name_en_2 = null
    }
    
    if (brandPosition === 3 || brandPosition === undefined) {
      updateData.brand_id_3 = null
      updateData.brand_name_kr_3 = null
      updateData.brand_name_en_3 = null
    }

    const { error } = await supabase
      .from('select_hotels')
      .update(updateData)
      .eq('sabre_id', sabreId)

    if (error) {
      console.error('[chain-brand] disconnectHotelFromBrand error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/chain-brand')
    return { success: true }
  } catch (e) {
    console.error('[chain-brand] disconnectHotelFromBrand exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 체인에 연결된 호텔 목록 조회 (브랜드1, 브랜드2, 브랜드3 모두 포함)
 */
export async function getChainHotels(chainId: number): Promise<ActionResult<{
  hotels: Array<{
    sabre_id: string
    property_name_ko: string | null
    property_name_en: string | null
    property_address: string | null
    city_ko: string | null
    country_ko: string | null
    brand_id: number | null
    brand_position?: 1 | 2 | 3 // 브랜드 위치 정보
  }>
}>> {
  try {
    const supabase = createServiceRoleClient()

    // 체인에 속한 브랜드들의 ID를 먼저 가져옴
    const { data: brands, error: brandsError } = await supabase
      .from('hotel_brands')
      .select('brand_id')
      .eq('chain_id', chainId)

    if (brandsError) {
      console.error('[chain-brand] getChainHotels brands error:', brandsError)
      return { success: false, error: brandsError.message }
    }

    const brandIds = (brands || []).map(b => b.brand_id)

    if (brandIds.length === 0) {
      return { success: true, data: { hotels: [] } }
    }

    // 브랜드1, 브랜드2, 브랜드3 모두에서 해당 브랜드 ID를 가진 호텔 조회
    const { data: hotels1, error: error1 } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, property_address, city_ko, country_ko, brand_id')
      .in('brand_id', brandIds)
      .order('property_name_ko', { ascending: true, nullsFirst: false })

    const { data: hotels2, error: error2 } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, property_address, city_ko, country_ko, brand_id_2')
      .in('brand_id_2', brandIds)
      .order('property_name_ko', { ascending: true, nullsFirst: false })

    const { data: hotels3, error: error3 } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, property_address, city_ko, country_ko, brand_id_3')
      .in('brand_id_3', brandIds)
      .order('property_name_ko', { ascending: true, nullsFirst: false })

    if (error1 || error2 || error3) {
      console.error('[chain-brand] getChainHotels error:', error1 || error2 || error3)
      return { success: false, error: (error1 || error2 || error3)?.message || '호텔 조회 중 오류가 발생했습니다.' }
    }

    // 중복 제거 및 브랜드 위치 정보 추가
    const hotelMap = new Map<string, { sabre_id: string; property_name_ko: string | null; property_name_en: string | null; property_address: string | null; city_ko: string | null; country_ko: string | null; brand_id: number | null; brand_position?: 1 | 2 | 3 }>()
    
    hotels1?.forEach(hotel => {
      hotelMap.set(hotel.sabre_id, { 
        sabre_id: hotel.sabre_id,
        property_name_ko: hotel.property_name_ko,
        property_name_en: hotel.property_name_en,
        property_address: hotel.property_address,
        city_ko: hotel.city_ko,
        country_ko: hotel.country_ko,
        brand_id: hotel.brand_id,
        brand_position: 1 
      })
    })
    
    hotels2?.forEach(hotel => {
      const existing = hotelMap.get(hotel.sabre_id)
      if (existing) {
        // 이미 존재하는 경우, 여러 브랜드 위치에 속할 수 있음 (첫 번째 위치 유지)
        hotelMap.set(hotel.sabre_id, existing)
      } else {
        // brand_id_2를 brand_id로 매핑
        hotelMap.set(hotel.sabre_id, { 
          sabre_id: hotel.sabre_id,
          property_name_ko: hotel.property_name_ko,
          property_name_en: hotel.property_name_en,
          property_address: hotel.property_address,
          city_ko: hotel.city_ko,
          country_ko: hotel.country_ko,
          brand_id: (hotel as any).brand_id_2 || null,
          brand_position: 2 
        })
      }
    })
    
    hotels3?.forEach(hotel => {
      const existing = hotelMap.get(hotel.sabre_id)
      if (existing) {
        // 이미 존재하는 경우, 여러 브랜드 위치에 속할 수 있음 (첫 번째 위치 유지)
        hotelMap.set(hotel.sabre_id, existing)
      } else {
        // brand_id_3를 brand_id로 매핑
        hotelMap.set(hotel.sabre_id, { 
          sabre_id: hotel.sabre_id,
          property_name_ko: hotel.property_name_ko,
          property_name_en: hotel.property_name_en,
          property_address: hotel.property_address,
          city_ko: hotel.city_ko,
          country_ko: hotel.country_ko,
          brand_id: (hotel as any).brand_id_3 || null,
          brand_position: 3 
        })
      }
    })

    const hotels = Array.from(hotelMap.values())

    return { 
      success: true, 
      data: { 
        hotels
      } 
    }
  } catch (e) {
    console.error('[chain-brand] getChainHotels exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

