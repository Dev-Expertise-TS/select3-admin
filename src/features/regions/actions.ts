'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { RegionFormInput, RegionsQueryParams, SelectRegion } from '@/types/regions'

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

const TABLE = 'select_regions'

function normalizeString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export async function listRegions(params: RegionsQueryParams = {}): Promise<ActionResult<{ items: SelectRegion[]; total: number }>> {
  try {
    const supabase = createServiceRoleClient()
    const page = params.page && params.page > 0 ? params.page : 1
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase.from(TABLE).select('*', { count: 'exact' })

    if (params.type) {
      query = query.eq('region_type', params.type)
    }

    if (params.search && params.search.trim() !== '') {
      const q = params.search.trim()
      // 간단 검색: 한/영 도시/국가/대륙/지역명 포함
      query = query.or(
        [
          `city_kr.ilike.%${q}%`,
          `city_en.ilike.%${q}%`,
          `country_ko.ilike.%${q}%`,
          `country_en.ilike.%${q}%`,
          `continent_ko.ilike.%${q}%`,
          `continent_en.ilike.%${q}%`,
          `region_name_kr.ilike.%${q}%`,
          `region_name_en.ilike.%${q}%`,
        ].join(',')
      )
    }

    const sortKey = params.sortKey ?? 'id'
    const sortOrder = params.sortOrder ?? 'asc'
    query = query.order(sortKey as string, { ascending: sortOrder === 'asc' })

    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error('[regions] list error:', error)
      return { success: false, error: '지역 목록 조회에 실패했습니다.' }
    }

    return {
      success: true,
      data: { items: (data as SelectRegion[]) || [], total: count || 0 },
    }
  } catch (e) {
    console.error('[regions] list exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

export async function createRegion(input: RegionFormInput): Promise<ActionResult<SelectRegion>> {
  try {
    const supabase = createServiceRoleClient()

    if (!input.region_type) {
      return { success: false, error: 'region_type은 필수입니다.' }
    }

    const payload = {
      region_type: input.region_type,
      city_kr: normalizeString(input.city_kr),
      city_en: normalizeString(input.city_en),
      city_sort_order: normalizeNumber(input.city_sort_order),
      country_ko: normalizeString(input.country_ko),
      country_en: normalizeString(input.country_en),
      country_sort_order: normalizeNumber(input.country_sort_order),
      continent_ko: normalizeString(input.continent_ko),
      continent_en: normalizeString(input.continent_en),
      continent_sort_order: normalizeNumber(input.continent_sort_order),
      region_name_kr: normalizeString(input.region_name_kr),
      region_name_en: normalizeString(input.region_name_en),
      region_name_sort_order: normalizeNumber(input.region_name_sort_order),
    }

    const { data, error } = await createServiceRoleClient()
      .from(TABLE)
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      console.error('[regions] create error:', error)
      return { success: false, error: `생성에 실패했습니다: ${error.message}` }
    }

    revalidatePath('/admin/region-mapping')
    return { success: true, data: data as SelectRegion }
  } catch (e) {
    console.error('[regions] create exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

export async function updateRegion(id: number, input: RegionFormInput): Promise<ActionResult<SelectRegion>> {
  try {
    const supabase = createServiceRoleClient()

    if (!id || id <= 0) {
      return { success: false, error: '유효한 id가 필요합니다.' }
    }

    const payload = {
      region_type: input.region_type,
      city_kr: normalizeString(input.city_kr),
      city_en: normalizeString(input.city_en),
      city_sort_order: normalizeNumber(input.city_sort_order),
      country_ko: normalizeString(input.country_ko),
      country_en: normalizeString(input.country_en),
      country_sort_order: normalizeNumber(input.country_sort_order),
      continent_ko: normalizeString(input.continent_ko),
      continent_en: normalizeString(input.continent_en),
      continent_sort_order: normalizeNumber(input.continent_sort_order),
      region_name_kr: normalizeString(input.region_name_kr),
      region_name_en: normalizeString(input.region_name_en),
      region_name_sort_order: normalizeNumber(input.region_name_sort_order),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('[regions] update error:', error)
      return { success: false, error: `수정에 실패했습니다: ${error.message}` }
    }

    revalidatePath('/admin/region-mapping')
    return { success: true, data: data as SelectRegion }
  } catch (e) {
    console.error('[regions] update exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

export async function deleteRegion(id: number): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()
    if (!id || id <= 0) {
      return { success: false, error: '유효한 id가 필요합니다.' }
    }

    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) {
      console.error('[regions] delete error:', error)
      return { success: false, error: `삭제에 실패했습니다: ${error.message}` }
    }

    revalidatePath('/admin/region-mapping')
    return { success: true }
  } catch (e) {
    console.error('[regions] delete exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * select_hotels의 city_kr/city_en을 읽어 고유 조합을 city 타입으로 upsert
 * upsert 기준: (region_type='city', city_kr, city_en)
 */
export async function upsertCitiesFromHotels(): Promise<ActionResult<{ upserted: number }>> {
  try {
    const supabase = createServiceRoleClient()

    // 호텔에서 도시명 수집
    const { data: hotels, error: hotelsError } = await supabase
      .from('select_hotels')
      .select('city_ko, city_en')

    if (hotelsError) {
      console.error('[regions] fetch hotels error:', hotelsError)
      return { success: false, error: '호텔 데이터 조회 실패' }
    }

    const uniqueKey = (kr: unknown, en: unknown) => `${String(kr ?? '').trim()}||${String(en ?? '').trim()}`
    const seen = new Set<string>()
    const rows: Array<{ region_type: 'city'; city_kr: string | null; city_en: string | null }> = []

    for (const h of hotels || []) {
      // 컬럼 명 혼동 방지: DB에는 city_ko 존재, regions에는 city_kr 사용 → 매핑
      const cityKr = h.city_ko == null ? null : String(h.city_ko).trim() || null
      const cityEn = h.city_en == null ? null : String(h.city_en).trim() || null
      if (!cityKr && !cityEn) continue
      const key = uniqueKey(cityKr, cityEn)
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({ region_type: 'city', city_kr: cityKr, city_en: cityEn })
    }

    if (rows.length === 0) {
      return { success: true, data: { upserted: 0 } }
    }

    // upsert: 고유 제약이 없다면 conflict를 (region_type, city_kr, city_en)로 가정
    const { error: upsertError, count } = await supabase
      .from('select_regions')
      .upsert(rows, { onConflict: 'region_type,city_kr,city_en', ignoreDuplicates: false })
      .select('id', { count: 'exact' })

    if (upsertError) {
      console.error('[regions] upsert cities error:', upsertError)
      return { success: false, error: `도시 upsert 실패: ${upsertError.message}` }
    }

    revalidatePath('/admin/region-mapping')
    return { success: true, data: { upserted: count ?? rows.length } }
  } catch (e) {
    console.error('[regions] upsert cities exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}


