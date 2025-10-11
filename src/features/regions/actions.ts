'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { RegionFormInput, RegionsQueryParams, SelectRegion } from '@/types/regions'
import { normalizeSlug } from '@/lib/media-naming'
import { CITY_SLUG_TO_IATA_CITY_CODE, COUNTRY_SLUG_TO_ISO2, CONTINENT_SLUG_TO_CODE } from './iata-maps'

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

// 매우 간단한 매핑/추정기: 실제 운영 시에는 별도 레퍼런스 테이블 사용 권장
function toSlugLower(s: string | null | undefined) {
  if (!s) return ''
  return normalizeSlug(String(s)).toLowerCase()
}

function guessIataCityCode(cityEnOrKo: string): string | null {
  const bySlug = toSlugLower(cityEnOrKo)
  if (CITY_SLUG_TO_IATA_CITY_CODE[bySlug]) return CITY_SLUG_TO_IATA_CITY_CODE[bySlug]
  // heuristic: remove spaces to catch older mapping
  const compact = bySlug.replace(/-/g, '')
  if (CITY_SLUG_TO_IATA_CITY_CODE[compact]) return CITY_SLUG_TO_IATA_CITY_CODE[compact]
  return null
}

function guessIsoCountryCode(countryEnOrKo: string): string | null {
  const slug = toSlugLower(countryEnOrKo)
  if (COUNTRY_SLUG_TO_ISO2[slug]) return COUNTRY_SLUG_TO_ISO2[slug]
  return null
}

function guessContinentCode(continentEnOrKo: string): string | null {
  const slug = toSlugLower(continentEnOrKo)
  if (CONTINENT_SLUG_TO_CODE[slug]) return CONTINENT_SLUG_TO_CODE[slug]
  return null
}

function eqOrIsNull<T extends { eq: (col: string, val: unknown) => T; is: (col: string, val: null) => T }>(
  q: T,
  column: string,
  value: unknown
): T {
  if (value === null || value === undefined) {
    return q.is(column, null)
  }
  return q.eq(column, value)
}

// Enhanced IATA city code mapping (most common cities)
const KNOWN_IATA_CODES: Record<string, string> = {
  'bangkok': 'BKK',
  'singapore': 'SIN',
  'seoul': 'SEL',
  'busan': 'PUS',
  'tokyo': 'TYO',
  'osaka': 'OSA',
  'hong kong': 'HKG',
  'taipei': 'TPE',
  'shanghai': 'SHA',
  'beijing': 'BJS',
  'london': 'LON',
  'paris': 'PAR',
  'new york': 'NYC',
  'los angeles': 'LAX',
  'san francisco': 'SFO',
  'chicago': 'CHI',
  'dubai': 'DXB',
  'sydney': 'SYD',
  'melbourne': 'MEL',
  'auckland': 'AKL',
  'kuala lumpur': 'KUL',
  'jakarta': 'JKT',
  'manila': 'MNL',
  'ho chi minh': 'SGN',
  'hanoi': 'HAN',
  'danang': 'DAD',
  'phuket': 'HKT',
  'bali': 'DPS',
  'denpasar': 'DPS',
  'mumbai': 'BOM',
  'delhi': 'DEL',
  'bangalore': 'BLR',
  'istanbul': 'IST',
  'moscow': 'MOW',
  'rome': 'ROM',
  'barcelona': 'BCN',
  'madrid': 'MAD',
  'amsterdam': 'AMS',
  'berlin': 'BER',
  'munich': 'MUC',
  'zurich': 'ZRH',
  'vienna': 'VIE',
  'prague': 'PRG',
  'athens': 'ATH',
  'lisbon': 'LIS',
  'miami': 'MIA',
  'las vegas': 'LAS',
  'seattle': 'SEA',
  'boston': 'BOS',
  'washington': 'WAS',
  'toronto': 'YTO',
  'vancouver': 'YVR',
  'montreal': 'YMQ',
  'mexico city': 'MEX',
  'cancun': 'CUN',
  'sao paulo': 'SAO',
  'rio de janeiro': 'RIO',
  'buenos aires': 'BUE',
  'cape town': 'CPT',
  'johannesburg': 'JNB',
  'cairo': 'CAI',
  'doha': 'DOH',
  'abu dhabi': 'AUH',
  'honolulu': 'HNL',
  'pattaya': 'BKK',
  'krabi': 'KBV',
  'chiang mai': 'CNX',
  'koh samui': 'USM',
  'hua hin': 'HHQ',
  'macau': 'MFM',
  'maldives': 'MLE',
  'male': 'MLE',
  'seogwipo': 'CJU',
  'jeju': 'CJU',
  'fukuoka': 'FUK',
  'sapporo': 'SPK',
  'okinawa': 'OKA',
  'naha': 'OKA',
  'kyoto': 'OSA',
  'gianyar': 'DPS',
  'ubud': 'DPS',
  'seminyak': 'DPS',
  'nusa dua': 'DPS',
  'sanur': 'DPS',
  'kuta': 'DPS',
  'jimbaran': 'DPS',
  'kapolei': 'HNL',
  'waimea': 'HNL',
  'kailua': 'HNL',
  'wailea': 'OGG',
  'maui': 'OGG',
  'kauai': 'LIH',
  'hilo': 'ITO',
  'kona': 'KOA',
  // 추가 도시들
  'inuyama': 'NGO', // 나고야 공항
  'solidaridad': 'CUN', // 칸쿤 인근
  'kothaifaru': 'MLE', // 몰디브
  'omadhoo': 'MLE', // 몰디브
  'panglao': 'TAG', // 보홀 공항
  'shinjuku': 'TYO', // 도쿄
  'shinjuku city': 'TYO', // 도쿄
  'tsim sha tsui': 'HKG', // 홍콩
  'cartagena': 'CTG', // 카르타헤나 공항
  'macao': 'MFM', // 마카오 (오타 수정)
  'onna': 'OKA', // 오키나와
  'kutchan': 'CTS', // 삿포로 신치토세
  'dien ban': 'DAD', // 다낭
  'sapa': 'HAN', // 하노이
  'niseko': 'CTS', // 니세코 (삿포로)
  'hoi an': 'DAD', // 다낭
  'nha trang': 'CXR', // 나트랑
  'vung tau': 'SGN', // 호치민
  'mui ne': 'SGN', // 호치민
  'phnom penh': 'PNH', // 프놈펜
  'siem reap': 'REP', // 시엠립
  'luang prabang': 'LPQ', // 루앙프라방
  'vientiane': 'VTE', // 비엔티안
  'yangon': 'RGN', // 양곤
  'bagan': 'NYU', // 바간
  'mandalay': 'MDL', // 만달레이
  // 추가 도시들 2차
  'ko yao noi': 'HKT', // 푸켓 인근
  'montaione': 'FLR', // 피렌체
  'milan': 'MIL', // 밀라노
  'playa del carmen': 'CUN', // 칸쿤 인근
  'rio de janeiro': 'RIO', // 리우
  'gaia': 'OPO', // 포르투
  'wan chai': 'HKG', // 홍콩
  'canggu': 'DPS', // 발리
  'karangasem': 'DPS', // 발리
  'tremezzina': 'MIL', // 코모 호수, 밀라노
  'lapu-lapu': 'CEB', // 세부
  'phu quoc': 'PQC', // 푸꾸옥
  'tamuning': 'GUM', // 괌
  'shima': 'NGO', // 나고야 인근
  'marrakech': 'RAK', // 마라케시
  'mexico city': 'MEX', // 멕시코시티
  'pecatu': 'DPS', // 발리
  'ko samui': 'USM', // 코사무이
  'koh samui': 'USM', // 코사무이
  'santa monica': 'LAX', // LA
  'ninh hòa': 'CXR', // 나트랑
  'ninh hai': 'CXR', // 나트랑
  'cuyo': 'CYU', // 필리핀
  'ho chi minh city': 'SGN', // 호치민
  'ho chi minh': 'SGN', // 호치민
  'kuala lumpur': 'KUL', // 쿠알라룸푸르
  'chiang mai': 'CNX', // 치앙마이
  'karuizawa': 'TYO', // 도쿄 인근
  'kota kinabalu': 'BKI', // 코타키나발루
  'cam lam': 'CXR', // 나트랑
  'hoi an': 'DAD', // 다낭
  'sanya': 'SYX', // 산야
  'chengdu': 'CTU', // 청두
  'an thoi': 'PQC', // 푸꾸옥
  'beppu': 'OIT', // 벳푸
  'ko chang': 'BKK', // 방콕
  'pak chong': 'BKK', // 방콕
  'hangzhou': 'HGH', // 항저우
  'new york': 'NYC', // 뉴욕
  'quy nhơn': 'UIH', // 퀴논
  'quy nhon': 'UIH', // 퀴논
  'con dao': 'VCS', // 콘다오
  'yokohama': 'TYO', // 도쿄
  'abu dhabi': 'AUH', // 아부다비
  'san francisco': 'SFO', // 샌프란시스코
  'las vegas': 'LAS', // 라스베가스
  'bressanone': 'BZO', // 볼차노
  'siem reap': 'REP', // 시엠립
  'uluwatu': 'DPS', // 발리
  'los angeles': 'LAX', // LA
  'kapalua': 'OGG', // 마우이
  'kowloon': 'HKG', // 홍콩
  'salerno': 'NAP', // 나폴리
  'choeng thale': 'HKT', // 푸켓
  'burleigh heads': 'OOL', // 골드코스트
  'san cassiano in badia': 'BZO', // 볼차노
  'vinh long': 'SGN', // 호치민
  'phu loc': 'HUI', // 후에
  'shinjuku': 'TYO', // 도쿄
}

// Lookup IATA code from known mappings
function lookupKnownIataCode(cityEn?: string | null): string | null {
  if (!cityEn || !cityEn.trim()) return null
  const normalized = normalizeSlug(cityEn)
  return KNOWN_IATA_CODES[normalized] || null
}

// Standard DB lookup: iata_city_codes (slug, city_en, code)
async function lookupIataCityCodeDB(cityEn?: string | null, cityKo?: string | null): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient()
    const candidates: string[] = []
    if (cityEn && cityEn.trim()) candidates.push(normalizeSlug(cityEn))
    if (cityKo && cityKo.trim()) candidates.push(normalizeSlug(cityKo))

    // 1) slug exact match
    for (const slug of candidates) {
      const { data, error } = await supabase
        .from('iata_city_codes')
        .select('code')
        .eq('slug', slug)
        .limit(1)

      if (!error && data && data.length > 0) {
        const code = data[0]?.code
        if (typeof code === 'string' && code.length > 0) return code.toUpperCase()
      }
    }

    // 2) english name exact/ilike
    if (cityEn && cityEn.trim()) {
      const exact = await supabase
        .from('iata_city_codes')
        .select('code')
        .eq('city_en', cityEn.trim())
        .limit(1)
      if (!exact.error && exact.data && exact.data.length > 0) {
        const code = exact.data[0]?.code
        if (typeof code === 'string' && code.length > 0) return code.toUpperCase()
      }

      const fuzzy = await supabase
        .from('iata_city_codes')
        .select('code')
        .ilike('city_en', cityEn.trim())
        .limit(1)
      if (!fuzzy.error && fuzzy.data && fuzzy.data.length > 0) {
        const code = fuzzy.data[0]?.code
        if (typeof code === 'string' && code.length > 0) return code.toUpperCase()
      }
    }
  } catch (e) {
    // fail silent: fallback to heuristics
  }
  return null
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
          `city_ko.ilike.%${q}%`,
          `city_en.ilike.%${q}%`,
          `country_ko.ilike.%${q}%`,
          `country_en.ilike.%${q}%`,
          `continent_ko.ilike.%${q}%`,
          `continent_en.ilike.%${q}%`,
          `region_name_ko.ilike.%${q}%`,
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

    const payload: Record<string, unknown> = {
      region_type: input.region_type,
      status: input.status || 'active',
      city_ko: normalizeString(input.city_ko),
      city_en: normalizeString(input.city_en),
      city_code: normalizeString((input as any).city_code),
      city_slug: normalizeString((input as any).city_slug),
      city_sort_order: normalizeNumber(input.city_sort_order),
      country_ko: normalizeString(input.country_ko),
      country_en: normalizeString(input.country_en),
      country_code: normalizeString((input as any).country_code),
      country_slug: normalizeString((input as any).country_slug),
      country_sort_order: normalizeNumber(input.country_sort_order),
      continent_ko: normalizeString(input.continent_ko),
      continent_en: normalizeString(input.continent_en),
      continent_code: normalizeString((input as any).continent_code),
      continent_slug: normalizeString((input as any).continent_slug),
      continent_sort_order: normalizeNumber(input.continent_sort_order),
      region_name_ko: normalizeString(input.region_name_ko),
      region_name_en: normalizeString(input.region_name_en),
      region_code: normalizeString((input as any).region_code),
      region_slug: normalizeString((input as any).region_slug),
      region_name_sort_order: normalizeNumber(input.region_name_sort_order),
    }

    console.log('[regions] createRegion input:', input)
    console.log('[regions] createRegion payload:', payload)

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

    const payload: Record<string, unknown> = {
      region_type: input.region_type,
      status: input.status || 'active',
      city_ko: normalizeString(input.city_ko),
      city_en: normalizeString(input.city_en),
      city_code: normalizeString((input as any).city_code),
      city_slug: normalizeString((input as any).city_slug),
      city_sort_order: normalizeNumber(input.city_sort_order),
      country_ko: normalizeString(input.country_ko),
      country_en: normalizeString(input.country_en),
      country_code: normalizeString((input as any).country_code),
      country_slug: normalizeString((input as any).country_slug),
      country_sort_order: normalizeNumber(input.country_sort_order),
      continent_ko: normalizeString(input.continent_ko),
      continent_en: normalizeString(input.continent_en),
      continent_code: normalizeString((input as any).continent_code),
      continent_slug: normalizeString((input as any).continent_slug),
      continent_sort_order: normalizeNumber(input.continent_sort_order),
      region_name_ko: normalizeString(input.region_name_ko),
      region_name_en: normalizeString(input.region_name_en),
      region_code: normalizeString((input as any).region_code),
      region_slug: normalizeString((input as any).region_slug),
      region_name_sort_order: normalizeNumber(input.region_name_sort_order),
      updated_at: new Date().toISOString(),
    }

    console.log('[regions] updateRegion input:', input)
    console.log('[regions] updateRegion payload:', payload)

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

export async function upsertRegion(input: RegionFormInput & { id?: number }): Promise<ActionResult<SelectRegion>> {
  try {
    const supabase = createServiceRoleClient()

    if (!input.region_type) {
      return { success: false, error: 'region_type은 필수입니다.' }
    }

    const payload: Record<string, unknown> = {
      region_type: input.region_type,
      status: input.status, // ✅ 자동 'active' 제거, 사용자가 설정한 값만 사용
      city_ko: normalizeString(input.city_ko),
      city_en: normalizeString(input.city_en),
      city_code: normalizeString((input as Record<string, unknown>).city_code as string),
      city_slug: normalizeString((input as Record<string, unknown>).city_slug as string),
      city_sort_order: normalizeNumber(input.city_sort_order),
      country_ko: normalizeString(input.country_ko),
      country_en: normalizeString(input.country_en),
      country_code: normalizeString((input as Record<string, unknown>).country_code as string),
      country_slug: normalizeString((input as Record<string, unknown>).country_slug as string),
      country_sort_order: normalizeNumber(input.country_sort_order),
      continent_ko: normalizeString(input.continent_ko),
      continent_en: normalizeString(input.continent_en),
      continent_code: normalizeString((input as Record<string, unknown>).continent_code as string),
      continent_slug: normalizeString((input as Record<string, unknown>).continent_slug as string),
      continent_sort_order: normalizeNumber(input.continent_sort_order),
      region_name_ko: normalizeString(input.region_name_ko),
      region_name_en: normalizeString(input.region_name_en),
      region_code: normalizeString((input as Record<string, unknown>).region_code as string),
      region_slug: normalizeString((input as Record<string, unknown>).region_slug as string),
      region_name_sort_order: normalizeNumber(input.region_name_sort_order),
      updated_at: new Date().toISOString(),
    }

    console.log('[regions] upsertRegion input:', input)
    console.log('[regions] upsertRegion payload:', payload)

    // ✅ ID가 있으면 단순 upsert (코드 검색 없이)
    if (input.id) {
      console.log('[regions] ID provided, direct upsert to ID:', input.id)
      payload.id = input.id
    } else {
      // ✅ ID가 없을 때만 코드 기준으로 기존 레코드 찾기
      let existingRecord = null
      
      // region_type별로 해당 코드로 기존 레코드 검색
      if (input.region_type === 'city' && payload.city_code) {
        const { data } = await supabase
          .from(TABLE)
          .select('id')
          .eq('region_type', 'city')
          .eq('city_code', payload.city_code)
          .maybeSingle()
        existingRecord = data
      } else if (input.region_type === 'country' && payload.country_code) {
        const { data } = await supabase
          .from(TABLE)
          .select('id')
          .eq('region_type', 'country')
          .eq('country_code', payload.country_code)
          .maybeSingle()
        existingRecord = data
      } else if (input.region_type === 'continent' && payload.continent_code) {
        const { data } = await supabase
          .from(TABLE)
          .select('id')
          .eq('region_type', 'continent')
          .eq('continent_code', payload.continent_code)
          .maybeSingle()
        existingRecord = data
      } else if (input.region_type === 'region' && payload.region_code) {
        const { data } = await supabase
          .from(TABLE)
          .select('id')
          .eq('region_type', 'region')
          .eq('region_code', payload.region_code)
          .maybeSingle()
        existingRecord = data
      }
      
      if (existingRecord) {
        console.log('[regions] Found existing record by code, will update:', existingRecord.id)
        payload.id = existingRecord.id
      }
    }
    // payload.id가 undefined면 새로 삽입

    console.log('[regions] upsertRegion final payload with id:', payload.id)

    // ✅ ID 유무에 따라 명확하게 update/insert 분기
    let data: SelectRegion | null = null
    let error: any = null

    if (payload.id) {
      // ✅ ID가 있으면 UPDATE만 실행
      console.log('[regions] Executing UPDATE for id:', payload.id)
      const result = await supabase
        .from(TABLE)
        .update(payload)
        .eq('id', payload.id)
        .select('*')
        .single()
      
      data = result.data
      error = result.error
    } else {
      // ✅ ID가 없으면 INSERT만 실행
      console.log('[regions] Executing INSERT (new record)')
      const result = await supabase
        .from(TABLE)
        .insert(payload)
        .select('*')
        .single()
      
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('[regions] operation error:', error)
      console.error('[regions] operation error code:', error.code)
      console.error('[regions] operation error details:', error.details)
      return { success: false, error: `저장에 실패했습니다: ${error.message}` }
    }

    console.log('[regions] operation success, result:', data)
    revalidatePath('/admin/region-mapping')
    return { success: true, data: data as SelectRegion }
  } catch (e) {
    console.error('[regions] upsert exception:', e)
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
 * select_hotels의 city_ko/city_en을 읽어 고유 조합을 city 타입으로 insert-only 병합
 * 병합 기준: (region_type='city', city_ko, city_en)
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
    const rows: Array<{ region_type: 'city'; city_ko: string | null; city_en: string | null; city_code?: string | null; city_slug?: string | null }> = []

    for (const h of hotels || []) {
      const cityKo = h.city_ko == null ? null : String(h.city_ko).trim() || null
      const cityEn = h.city_en == null ? null : String(h.city_en).trim() || null
      if (!cityKo && !cityEn) continue
      const key = uniqueKey(cityKo, cityEn)
      if (seen.has(key)) continue
      seen.add(key)
      const citySlug = cityEn ? normalizeSlug(cityEn) : cityKo ? normalizeSlug(cityKo) : null
      let cityCode = lookupKnownIataCode(cityEn ?? undefined) || await lookupIataCityCodeDB(cityEn ?? undefined, cityKo ?? undefined)
      if (!cityCode && cityEn) cityCode = guessIataCityCode(cityEn)
      console.log(`[regions] Processing city: ${cityKo}/${cityEn} -> code: ${cityCode}, slug: ${citySlug}`)
      rows.push({ region_type: 'city', city_ko: cityKo, city_en: cityEn, city_code: cityCode, city_slug: citySlug })
    }

    if (rows.length === 0) {
      return { success: true, data: { upserted: 0 } }
    }

    // 고유 제약이 없을 수 있으므로 수동 병합:
    // 1) 기존 city 타입 전체를 조회 (id, code, slug 포함)
    const { data: existingCities, error: existingError } = await supabase
      .from('select_regions')
      .select('id, city_ko, city_en, city_code, city_slug')
      .eq('region_type', 'city')

    if (existingError) {
      console.error('[regions] existing cities fetch error:', existingError)
      return { success: false, error: '기존 도시 데이터 조회 실패' }
    }

    const existingMap = new Map<string, { id: number; city_code: string | null; city_slug: string | null }>()
    for (const r of existingCities || []) {
      const cityKo = (r as any).city_ko == null ? null : String((r as any).city_ko).trim() || null
      const cityEn = (r as any).city_en == null ? null : String((r as any).city_en).trim() || null
      const key = `${String(cityKo ?? '')}||${String(cityEn ?? '')}`
      existingMap.set(key, {
        id: (r as any).id,
        city_code: (r as any).city_code || null,
        city_slug: (r as any).city_slug || null,
      })
    }

    const toInsert = rows.filter((r) => !existingMap.has(`${String(r.city_ko ?? '')}||${String(r.city_en ?? '')}`))
    const toUpdate = rows.filter((r) => existingMap.has(`${String(r.city_ko ?? '')}||${String(r.city_en ?? '')}`))

    let insertedCount = 0
    let updatedCount = 0

    // 신규 삽입
    if (toInsert.length > 0) {
      let insertError = null as unknown as { message?: string; code?: string } | null
      {
        const { error } = await supabase.from('select_regions').insert(toInsert)
        insertError = error
      }
      if (insertError && insertError.code === '42703') {
        // 컬럼 부재 시 code/slug 제외 재시도
        const fallback = toInsert.map(({ city_code: _cc, city_slug: _cs, ...rest }) => rest)
        const retry = await supabase.from('select_regions').insert(fallback)
        if (retry.error) insertError = retry.error as any
        else insertError = null
      }

      if (insertError) {
        console.error('[regions] insert cities error:', insertError)
        return { success: false, error: `도시 추가 실패: ${insertError.message}` }
      }
      insertedCount = toInsert.length
      console.log(`[regions] Inserted ${insertedCount} new cities`)
    }

    // 기존 레코드 업데이트 (code/slug가 없거나 변경된 경우)
    for (const r of toUpdate) {
      const key = `${String(r.city_ko ?? '')}||${String(r.city_en ?? '')}`
      const existing = existingMap.get(key)
      if (!existing) continue

      const updatePayload: Record<string, unknown> = {}
      
      // code가 없거나 새로운 값이 있으면 업데이트
      if (r.city_code && (!existing.city_code || existing.city_code !== r.city_code)) {
        updatePayload.city_code = r.city_code
      }
      
      // slug가 없거나 새로운 값이 있으면 업데이트
      if (r.city_slug && (!existing.city_slug || existing.city_slug !== r.city_slug)) {
        updatePayload.city_slug = r.city_slug
      }

      if (Object.keys(updatePayload).length === 0) continue

      const { error: updErr } = await supabase
        .from('select_regions')
        .update(updatePayload)
        .eq('id', existing.id)

      if (updErr && (updErr as any).code !== '42703') {
        console.warn(`[regions] Update failed for city id=${existing.id}:`, updErr)
      } else {
        updatedCount++
        console.log(`[regions] Updated city id=${existing.id} with`, updatePayload)
      }
    }

    revalidatePath('/admin/region-mapping')
    console.log(`[regions] City upsert complete: ${insertedCount} inserted, ${updatedCount} updated`)
    return { success: true, data: { upserted: insertedCount + updatedCount } }
  } catch (e) {
    console.error('[regions] upsert cities exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * select_hotels의 country_ko/country_en을 읽어 고유 조합을 country 타입으로 upsert(수동 병합)
 */
export async function upsertCountriesFromHotels(): Promise<ActionResult<{ upserted: number }>> {
  try {
    const supabase = createServiceRoleClient()

    const { data: hotels, error: hotelsError } = await supabase
      .from('select_hotels')
      .select('country_ko, country_en')

    if (hotelsError) {
      console.error('[regions] fetch hotels (country) error:', hotelsError)
      return { success: false, error: '호텔 데이터 조회 실패' }
    }

    const seen = new Set<string>()
    const rows: Array<{ region_type: 'country'; country_ko: string | null; country_en: string | null; country_code?: string | null; country_slug?: string | null }> = []
    for (const h of hotels || []) {
      const countryKo = h.country_ko == null ? null : String(h.country_ko).trim() || null
      const countryEn = h.country_en == null ? null : String(h.country_en).trim() || null
      if (!countryKo && !countryEn) continue
      const key = `${String(countryKo ?? '')}||${String(countryEn ?? '')}`
      if (seen.has(key)) continue
      seen.add(key)
      const countrySlug = countryEn ? normalizeSlug(countryEn) : countryKo ? normalizeSlug(countryKo) : null
      const countryCode = countryEn ? guessIsoCountryCode(countryEn) : null
      rows.push({ region_type: 'country', country_ko: countryKo, country_en: countryEn, country_code: countryCode, country_slug: countrySlug })
    }

    // 기존 country 타입 조회
    const { data: existingCountries, error: existingError } = await supabase
      .from('select_regions')
      .select('country_ko, country_en')
      .eq('region_type', 'country')

    if (existingError) {
      console.error('[regions] existing countries fetch error:', existingError)
      return { success: false, error: '기존 국가 데이터 조회 실패' }
    }

    const existingSet = new Set<string>()
    for (const r of existingCountries || []) {
      const countryKo = (r as any).country_ko == null ? null : String((r as any).country_ko).trim() || null
      const countryEn = r.country_en == null ? null : String(r.country_en).trim() || null
      existingSet.add(`${String(countryKo ?? '')}||${String(countryEn ?? '')}`)
    }

    const toInsert = rows.filter((r) => !existingSet.has(`${String(r.country_ko ?? '')}||${String(r.country_en ?? '')}`))

    if (toInsert.length === 0) {
      revalidatePath('/admin/region-mapping')
      return { success: true, data: { upserted: 0 } }
    }

    let insertError2 = null as unknown as { message?: string; code?: string } | null
    {
      const { error } = await supabase.from('select_regions').insert(toInsert)
      insertError2 = error
    }
    if (insertError2 && insertError2.code === '42703') {
      const fallback = toInsert.map(({ country_code: _cc, country_slug: _cs, ...rest }) => rest)
      const retry = await supabase.from('select_regions').insert(fallback)
      if (retry.error) insertError2 = retry.error as any
      else insertError2 = null
    }

    if (insertError2) {
      console.error('[regions] insert countries error:', insertError2)
      return { success: false, error: `국가 추가 실패: ${insertError2.message}` }
    }

    // 기존 행의 code/slug 업데이트 (각 컬럼 개별 비어있을 때만)
    for (const r of rows) {
      const updatePayload: Record<string, unknown> = {}
      if (r.country_code) updatePayload.country_code = r.country_code
      if (r.country_slug) updatePayload.country_slug = r.country_slug
      if (Object.keys(updatePayload).length === 0) continue

      let q = supabase.from('select_regions').update(updatePayload).eq('region_type', 'country')
      q = eqOrIsNull(q as any, 'country_ko', r.country_ko) as any
      q = eqOrIsNull(q as any, 'country_en', r.country_en) as any
      const { error: updErr } = await (q as any)
      if (updErr && (updErr as any).code === '42703') {
        // code/slug 컬럼이 없으면 무시
      }
    }

    revalidatePath('/admin/region-mapping')
    return { success: true, data: { upserted: toInsert.length } }
  } catch (e) {
    console.error('[regions] upsert countries exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * select_hotels의 continent_ko/continent_en을 읽어 고유 조합을 continent 타입으로 upsert(수동 병합)
 */
export async function upsertContinentsFromHotels(): Promise<ActionResult<{ upserted: number }>> {
  try {
    const supabase = createServiceRoleClient()

    const { data: hotels, error: hotelsError } = await supabase
      .from('select_hotels')
      .select('continent_ko, continent_en')

    if (hotelsError) {
      console.error('[regions] fetch hotels (continent) error:', hotelsError)
      return { success: false, error: '호텔 데이터 조회 실패' }
    }

    const seen = new Set<string>()
    const rows: Array<{ region_type: 'continent'; continent_ko: string | null; continent_en: string | null; continent_code?: string | null; continent_slug?: string | null }> = []
    for (const h of hotels || []) {
      const continentKo = h.continent_ko == null ? null : String(h.continent_ko).trim() || null
      const continentEn = h.continent_en == null ? null : String(h.continent_en).trim() || null
      if (!continentKo && !continentEn) continue
      const key = `${String(continentKo ?? '')}||${String(continentEn ?? '')}`
      if (seen.has(key)) continue
      seen.add(key)
      const continentSlug = continentEn ? normalizeSlug(continentEn) : continentKo ? normalizeSlug(continentKo) : null
      const continentCode = continentEn ? guessContinentCode(continentEn) : null
      rows.push({ region_type: 'continent', continent_ko: continentKo, continent_en: continentEn, continent_code: continentCode, continent_slug: continentSlug })
    }

    // 기존 continent 타입 조회
    const { data: existingContinents, error: existingError } = await supabase
      .from('select_regions')
      .select('continent_ko, continent_en')
      .eq('region_type', 'continent')

    if (existingError) {
      console.error('[regions] existing continents fetch error:', existingError)
      return { success: false, error: '기존 대륙 데이터 조회 실패' }
    }

    const existingSet = new Set<string>()
    for (const r of existingContinents || []) {
      const continentKo = r.continent_ko == null ? null : String(r.continent_ko).trim() || null
      const continentEn = r.continent_en == null ? null : String(r.continent_en).trim() || null
      existingSet.add(`${String(continentKo ?? '')}||${String(continentEn ?? '')}`)
    }

    const toInsert = rows.filter((r) => !existingSet.has(`${String(r.continent_ko ?? '')}||${String(r.continent_en ?? '')}`))

    if (toInsert.length === 0) {
      revalidatePath('/admin/region-mapping')
      return { success: true, data: { upserted: 0 } }
    }

    let insertError3 = null as unknown as { message?: string; code?: string } | null
    {
      const { error } = await supabase.from('select_regions').insert(toInsert)
      insertError3 = error
    }
    if (insertError3 && insertError3.code === '42703') {
      const fallback = toInsert.map(({ continent_code: _cc, continent_slug: _cs, ...rest }) => rest)
      const retry = await supabase.from('select_regions').insert(fallback)
      if (retry.error) insertError3 = retry.error as any
      else insertError3 = null
    }

    if (insertError3) {
      console.error('[regions] insert continents error:', insertError3)
      return { success: false, error: `대륙 추가 실패: ${insertError3.message}` }
    }

    // 기존 행의 code/slug 업데이트 (각 컬럼 개별 비어있을 때만)
    for (const r of rows) {
      const updatePayload: Record<string, unknown> = {}
      if (r.continent_code) updatePayload.continent_code = r.continent_code
      if (r.continent_slug) updatePayload.continent_slug = r.continent_slug
      if (Object.keys(updatePayload).length === 0) continue

      let q = supabase.from('select_regions').update(updatePayload).eq('region_type', 'continent')
      q = eqOrIsNull(q as any, 'continent_ko', r.continent_ko) as any
      q = eqOrIsNull(q as any, 'continent_en', r.continent_en) as any
      const { error: updErr } = await (q as any)
      if (updErr && (updErr as any).code === '42703') {
        // code/slug 컬럼이 없으면 무시
      }
    }

    revalidatePath('/admin/region-mapping')
    return { success: true, data: { upserted: toInsert.length } }
  } catch (e) {
    console.error('[regions] upsert continents exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * region 타입의 slug/code 보정: 기존 select_regions에서 region_type='region' 행의 slug/code가 없으면 채움
 * region_code는 표준이 없어 현재는 미설정(null 유지), slug는 이름 기반 생성
 */
export async function fillRegionSlugsAndCodes(): Promise<ActionResult<{ updated: number }>> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('select_regions')
      .select('id, region_name_ko, region_name_en, region_slug, region_code')
      .eq('region_type', 'region')

    if (error) {
      console.error('[regions] fetch regions (region) error:', error)
      return { success: false, error: '지역 데이터 조회 실패' }
    }

    let updated = 0
    for (const r of data || []) {
      const hasSlug = (r as any).region_slug
      const hasCode = (r as any).region_code
      const slugCandidate = (r as any).region_name_en ? normalizeSlug(String((r as any).region_name_en))
        : (r as any).region_name_ko ? normalizeSlug(String((r as any).region_name_ko))
        : null
      const payload: Record<string, unknown> = {}
      if (!hasSlug && slugCandidate) payload.region_slug = slugCandidate
      // region_code 없음: 표준 부재로 설정 생략
      if (Object.keys(payload).length === 0) continue
      const { error: updErr } = await supabase
        .from('select_regions')
        .update(payload)
        .eq('id', (r as any).id)
      if (!updErr) updated += 1
    }

    revalidatePath('/admin/region-mapping')
    return { success: true, data: { updated } }
  } catch (e) {
    console.error('[regions] fill region slug exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 기존 select_regions(city)에서 비어있는 city_code/city_slug 채우기
 */
export async function fillCityCodesAndSlugs(): Promise<ActionResult<{ updated: number }>> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('select_regions')
      .select('id, city_en, city_ko, city_code, city_slug')
      .eq('region_type', 'city')

    if (error) {
      console.error('[regions] fetch regions (city) error:', error)
      return { success: false, error: '도시 데이터 조회 실패' }
    }

    let updated = 0
    for (const r of data || []) {
      const hasCode = (r as any).city_code
      const hasSlug = (r as any).city_slug
      const cityEn = (r as any).city_en as string | null
      const cityKo = (r as any).city_ko as string | null
      let code = hasCode ? null : (lookupKnownIataCode(cityEn ?? undefined) || await lookupIataCityCodeDB(cityEn ?? undefined, cityKo ?? undefined))
      if (!code && cityEn) code = guessIataCityCode(cityEn)
      let slug = hasSlug ? null : ((cityEn ? normalizeSlug(cityEn) : (cityKo ? normalizeSlug(cityKo) : null)))
      const payload: Record<string, unknown> = {}
      if (code) payload.city_code = code
      if (slug) payload.city_slug = slug
      if (Object.keys(payload).length === 0) continue
      const { error: updErr } = await supabase
        .from('select_regions')
        .update(payload)
        .eq('id', (r as any).id)
      if (!updErr) updated += 1
    }

    revalidatePath('/admin/region-mapping')
    return { success: true, data: { updated } }
  } catch (e) {
    console.error('[regions] fill city codes/slugs exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * city_en이 있는 모든 도시의 city_code를 강제로 재조회하여 업데이트
 */
export async function forceUpdateAllCityCodes(): Promise<ActionResult<{ updated: number; total: number }>> {
  try {
    const supabase = createServiceRoleClient()
    // city_en이 있는 모든 도시 조회
    const { data, error } = await supabase
      .from('select_regions')
      .select('id, city_en, city_ko, city_code')
      .eq('region_type', 'city')
      .not('city_en', 'is', null)

    if (error) {
      console.error('[regions] fetch cities with city_en error:', error)
      return { success: false, error: '도시 데이터 조회 실패' }
    }

    const total = data?.length || 0
    let updated = 0

    console.log(`[regions] Force updating city codes for ${total} cities...`)

    for (const r of data || []) {
      const cityId = (r as any).id
      const cityEn = (r as any).city_en as string
      const cityKo = (r as any).city_ko as string | null
      const currentCode = (r as any).city_code as string | null

      // Known IATA codes로 코드 조회 (우선순위 1)
      let newCode = lookupKnownIataCode(cityEn)
      
      // DB 조회 (우선순위 2)
      if (!newCode) {
        newCode = await lookupIataCityCodeDB(cityEn, cityKo)
      }
      
      // 휴리스틱 (최종 fallback)
      if (!newCode) {
        newCode = guessIataCityCode(cityEn)
      }

      // 코드가 있고, 기존과 다르면 업데이트
      if (newCode && newCode !== currentCode) {
        const { error: updErr } = await supabase
          .from('select_regions')
          .update({ city_code: newCode })
          .eq('id', cityId)

        if (!updErr) {
          updated++
          console.log(`[regions] Updated city id=${cityId} "${cityEn}": ${currentCode || 'null'} → ${newCode}`)
        } else {
          console.warn(`[regions] Failed to update city id=${cityId}:`, updErr)
        }
      } else if (newCode === currentCode) {
        console.log(`[regions] City id=${cityId} "${cityEn}": already has correct code ${currentCode}`)
      } else {
        console.warn(`[regions] City id=${cityId} "${cityEn}": could not find IATA code`)
      }
    }

    revalidatePath('/admin/region-mapping')
    console.log(`[regions] Force update complete: ${updated}/${total} cities updated`)
    return { success: true, data: { updated, total } }
  } catch (e) {
    console.error('[regions] force update city codes exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 기존 select_regions(country)에서 비어있는 country_code/country_slug 채우기
 */
export async function fillCountryCodesAndSlugs(): Promise<ActionResult<{ updated: number }>> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('select_regions')
      .select('id, country_en, country_ko, country_code, country_slug')
      .eq('region_type', 'country')

    if (error) {
      console.error('[regions] fetch regions (country) error:', error)
      return { success: false, error: '국가 데이터 조회 실패' }
    }

    let updated = 0
    for (const r of data || []) {
      const hasCode = (r as any).country_code
      const hasSlug = (r as any).country_slug
      const countryEn = (r as any).country_en as string | null
      const countryKo = (r as any).country_ko as string | null
      let code = hasCode ? null : (countryEn ? guessIsoCountryCode(countryEn) : null)
      let slug = hasSlug ? null : ((countryEn ? normalizeSlug(countryEn) : (countryKo ? normalizeSlug(countryKo) : null)))
      const payload: Record<string, unknown> = {}
      if (code) payload.country_code = code
      if (slug) payload.country_slug = slug
      if (Object.keys(payload).length === 0) continue
      const { error: updErr } = await supabase
        .from('select_regions')
        .update(payload)
        .eq('id', (r as any).id)
      if (!updErr) updated += 1
    }

    revalidatePath('/admin/region-mapping')
    return { success: true, data: { updated } }
  } catch (e) {
    console.error('[regions] fill country codes/slugs exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 기존 select_regions(continent)에서 비어있는 continent_code/continent_slug 채우기
 */
export async function fillContinentCodesAndSlugs(): Promise<ActionResult<{ updated: number }>> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('select_regions')
      .select('id, continent_en, continent_ko, continent_code, continent_slug')
      .eq('region_type', 'continent')

    if (error) {
      console.error('[regions] fetch regions (continent) error:', error)
      return { success: false, error: '대륙 데이터 조회 실패' }
    }

    let updated = 0
    for (const r of data || []) {
      const hasCode = (r as any).continent_code
      const hasSlug = (r as any).continent_slug
      const continentEn = (r as any).continent_en as string | null
      const continentKo = (r as any).continent_ko as string | null
      let code = hasCode ? null : (continentEn ? guessContinentCode(continentEn) : null)
      let slug = hasSlug ? null : ((continentEn ? normalizeSlug(continentEn) : (continentKo ? normalizeSlug(continentKo) : null)))
      const payload: Record<string, unknown> = {}
      if (code) payload.continent_code = code
      if (slug) payload.continent_slug = slug
      if (Object.keys(payload).length === 0) continue
      const { error: updErr } = await supabase
        .from('select_regions')
        .update(payload)
        .eq('id', (r as any).id)
      if (!updErr) updated += 1
    }

    revalidatePath('/admin/region-mapping')
    return { success: true, data: { updated } }
  } catch (e) {
    console.error('[regions] fill continent codes/slugs exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 특정 지역 코드를 select_hotels 테이블에 매핑 (upsert)
 */
export async function mapRegionToHotels(regionId: number, regionType: RegionType): Promise<ActionResult<{ updated: number }>> {
  try {
    const supabase = createServiceRoleClient()
    
    // 지역 정보 조회
    const { data: region, error: regionError } = await supabase
      .from('select_regions')
      .select('*')
      .eq('id', regionId)
      .single()
    
    if (regionError || !region) {
      return { success: false, error: '지역 정보를 찾을 수 없습니다.' }
    }
    
    const r = region as any
    let updated = 0
    
    if (regionType === 'city' && r.city_code) {
      // city_ko, city_en이 일치하는 호텔들에 city_code 업데이트
      const cityKo = r.city_ko
      const cityEn = r.city_en
      
      let query = supabase.from('select_hotels').update({ city_code: r.city_code })
      if (cityKo && cityEn) {
        query = query.or(`city_ko.eq.${cityKo},city_en.eq.${cityEn}`)
      } else if (cityKo) {
        query = query.eq('city_ko', cityKo)
      } else if (cityEn) {
        query = query.eq('city_en', cityEn)
      }
      
      const { error: updateErr, count } = await query
      if (!updateErr && count !== null) updated = count
    }
    
    if (regionType === 'country' && r.country_code) {
      // country_ko, country_en이 일치하는 호텔들에 country_code 업데이트
      const countryKo = r.country_ko
      const countryEn = r.country_en
      
      let query = supabase.from('select_hotels').update({ country_code: r.country_code })
      if (countryKo && countryEn) {
        query = query.or(`country_ko.eq.${countryKo},country_en.eq.${countryEn}`)
      } else if (countryKo) {
        query = query.eq('country_ko', countryKo)
      } else if (countryEn) {
        query = query.eq('country_en', countryEn)
      }
      
      const { error: updateErr, count } = await query
      if (!updateErr && count !== null) updated = count
    }
    
    if (regionType === 'continent' && r.continent_code) {
      // continent_ko, continent_en이 일치하는 호텔들에 continent_code 업데이트
      const continentKo = r.continent_ko
      const continentEn = r.continent_en
      
      let query = supabase.from('select_hotels').update({ continent_code: r.continent_code })
      if (continentKo && continentEn) {
        query = query.or(`continent_ko.eq.${continentKo},continent_en.eq.${continentEn}`)
      } else if (continentKo) {
        query = query.eq('continent_ko', continentKo)
      } else if (continentEn) {
        query = query.eq('continent_en', continentEn)
      }
      
      const { error: updateErr, count } = await query
      if (!updateErr && count !== null) updated = count
    }
    
    if (regionType === 'region' && r.region_code) {
      // region_name_ko, region_name_en이 일치하는 호텔들에 region_code 업데이트
      const regionNameKr = r.region_name_ko
      const regionNameEn = r.region_name_en
      
      let query = supabase.from('select_hotels').update({ region_code: r.region_code })
      if (regionNameKr && regionNameEn) {
        query = query.or(`region_name_ko.eq.${regionNameKr},region_name_en.eq.${regionNameEn}`)
      } else if (regionNameKr) {
        query = query.eq('region_name_ko', regionNameKr)
      } else if (regionNameEn) {
        query = query.eq('region_name_en', regionNameEn)
      }
      
      const { error: updateErr, count } = await query
      if (!updateErr && count !== null) updated = count
    }
    
    revalidatePath('/admin/region-mapping')
    revalidatePath('/admin/hotel-search')
    revalidatePath('/admin/hotel-update')
    
    return { success: true, data: { updated } }
  } catch (e) {
    console.error('[regions] map region to hotels exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 모든 도시 레코드를 기반으로 호텔의 지역 코드를 일괄 업데이트
 */
export async function bulkUpdateHotelRegionCodes(): Promise<ActionResult<{ updated: number; total: number; errors: string[]; details: Record<string, number> }>> {
  try {
    const supabase = createServiceRoleClient()
    
    // 1. 모든 region 레코드 가져오기 (city, country, continent, region 모두)
    const { data: regions, error: regionsError } = await supabase
      .from('select_regions')
      .select('*')
    
    if (regionsError || !regions) {
      console.error('[regions] bulkUpdate fetch regions error:', regionsError)
      return { success: false, error: '지역 정보를 가져올 수 없습니다.' }
    }
    
    console.log(`[regions] bulkUpdate: found ${regions.length} regions`)
    
    let updated = 0
    const errors: string[] = []
    const details: Record<string, number> = {
      city: 0,
      country: 0,
      continent: 0,
      region: 0
    }
    
    // 2. 각 region에 대해 매칭되는 호텔 업데이트
    for (const region of regions) {
      try {
        const regionType = region.region_type as 'city' | 'country' | 'continent' | 'region'
        
        // 타입별 컬럼 매핑
        const columnMap = {
          city: { code: 'city_code', nameKo: 'city_ko', nameEn: 'city_en' },
          country: { code: 'country_code', nameKo: 'country_ko', nameEn: 'country_en' },
          continent: { code: 'continent_code', nameKo: 'continent_ko', nameEn: 'continent_en' },
          region: { code: 'region_code', nameKo: 'region_ko', nameEn: 'region_en' }
        }
        
        const columns = columnMap[regionType]
        
        // 매칭할 값 추출
        let codeValue: string | null = null
        let nameKoValue: string | null = null
        let nameEnValue: string | null = null
        
        if (regionType === 'city') {
          codeValue = region.city_code as string | null
          nameKoValue = region.city_ko as string | null
          nameEnValue = region.city_en as string | null
        } else if (regionType === 'country') {
          codeValue = region.country_code as string | null
          nameKoValue = region.country_ko as string | null
          nameEnValue = region.country_en as string | null
        } else if (regionType === 'continent') {
          codeValue = region.continent_code as string | null
          nameKoValue = region.continent_ko as string | null
          nameEnValue = region.continent_en as string | null
        } else if (regionType === 'region') {
          codeValue = region.region_code as string | null
          nameKoValue = region.region_name_ko as string | null
          nameEnValue = region.region_name_en as string | null
        }
        
        // 코드, 한글명, 영문명 중 하나라도 있어야 함
        if (!codeValue && !nameKoValue && !nameEnValue) {
          continue
        }
        
        // 호텔 찾기 (코드 OR 한글명 OR 영문명)
        let query = supabase
          .from('select_hotels')
          .select('sabre_id')
        
        const conditions: string[] = []
        if (codeValue && codeValue.trim()) {
          conditions.push(`${columns.code}.eq.${codeValue}`)
        }
        if (nameKoValue && nameKoValue.trim()) {
          conditions.push(`${columns.nameKo}.eq.${nameKoValue}`)
        }
        if (nameEnValue && nameEnValue.trim()) {
          conditions.push(`${columns.nameEn}.eq.${nameEnValue}`)
        }
        
        if (conditions.length === 0) {
          continue
        }
        
        query = query.or(conditions.join(','))
        
        const { data: hotels, error: hotelsError } = await query
        
        if (hotelsError) {
          const displayName = nameKoValue || nameEnValue || codeValue || `id:${region.id}`
          errors.push(`${displayName}: 호텔 조회 실패 - ${hotelsError.message}`)
          continue
        }
        
        if (!hotels || hotels.length === 0) {
          continue // 매칭되는 호텔 없음
        }
        
        // 중복 제거
        const uniqueHotels = Array.from(
          new Map(hotels.map(h => [h.sabre_id, h])).values()
        )
        
        // 각 호텔의 region 코드 업데이트
        for (const hotel of uniqueHotels) {
          // 업데이트할 필드 구성
          const updatePayload: Record<string, unknown> = {}
          
          if (regionType === 'city') {
            updatePayload.city_code = region.city_code || null
            updatePayload.city_ko = region.city_ko || null
            updatePayload.city_en = region.city_en || null
            // city가 가지고 있는 상위 지역 정보도 함께 업데이트
            updatePayload.country_code = region.country_code || null
            updatePayload.country_ko = region.country_ko || null
            updatePayload.country_en = region.country_en || null
            updatePayload.continent_code = region.continent_code || null
            updatePayload.continent_ko = region.continent_ko || null
            updatePayload.continent_en = region.continent_en || null
            updatePayload.region_code = region.region_code || null
            updatePayload.region_ko = region.region_name_ko || null
            updatePayload.region_en = region.region_name_en || null
          } else if (regionType === 'country') {
            updatePayload.country_code = region.country_code || null
            updatePayload.country_ko = region.country_ko || null
            updatePayload.country_en = region.country_en || null
            // country가 가지고 있는 상위 지역 정보도 함께 업데이트
            updatePayload.continent_code = region.continent_code || null
            updatePayload.continent_ko = region.continent_ko || null
            updatePayload.continent_en = region.continent_en || null
            updatePayload.region_code = region.region_code || null
            updatePayload.region_ko = region.region_name_ko || null
            updatePayload.region_en = region.region_name_en || null
          } else if (regionType === 'continent') {
            updatePayload.continent_code = region.continent_code || null
            updatePayload.continent_ko = region.continent_ko || null
            updatePayload.continent_en = region.continent_en || null
            // continent가 가지고 있는 지역 정보도 함께 업데이트
            updatePayload.region_code = region.region_code || null
            updatePayload.region_ko = region.region_name_ko || null
            updatePayload.region_en = region.region_name_en || null
          } else if (regionType === 'region') {
            updatePayload.region_code = region.region_code || null
            updatePayload.region_ko = region.region_name_ko || null
            updatePayload.region_en = region.region_name_en || null
          }
          
          const { error: updateError } = await supabase
            .from('select_hotels')
            .update(updatePayload)
            .eq('sabre_id', hotel.sabre_id)
          
          if (updateError) {
            errors.push(`${hotel.sabre_id}: 업데이트 실패 - ${updateError.message}`)
          } else {
            updated++
            details[regionType]++
          }
        }
      } catch (e) {
        const displayName = 
          (region.city_ko || region.city_en || 
           region.country_ko || region.country_en || 
           region.continent_ko || region.continent_en || 
           region.region_name_ko || region.region_name_en || 
           `id:${region.id}`) as string
        errors.push(`${displayName}: ${e instanceof Error ? e.message : '알 수 없는 오류'}`)
      }
    }
    
    console.log(`[regions] bulkUpdate completed:`, {
      updated,
      total: regions.length,
      details,
      errors: errors.length
    })
    
    revalidatePath('/admin/region-mapping')
    revalidatePath('/admin/hotel-search')
    
    return {
      success: true,
      data: {
        updated,
        total: regions.length,
        errors: errors.slice(0, 10),
        details
      }
    }
  } catch (e) {
    console.error('[regions] bulkUpdate exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 특정 지역에 매핑된 호텔 리스트 조회
 * 코드와 이름(ko, en) 모두를 고려하여 조회
 */
export async function getMappedHotels(
  code: string | null, 
  codeType: 'city' | 'country' | 'continent' | 'region',
  nameKo?: string | null,
  nameEn?: string | null
): Promise<ActionResult<{ hotels: Array<{ sabre_id: string; property_name_ko: string | null; property_name_en: string | null; property_address: string | null }> }>> {
  try {
    const supabase = createServiceRoleClient()
    
    const columnMap = {
      city: { code: 'city_code', nameKo: 'city_ko', nameEn: 'city_en' },
      country: { code: 'country_code', nameKo: 'country_ko', nameEn: 'country_en' },
      continent: { code: 'continent_code', nameKo: 'continent_ko', nameEn: 'continent_en' },
      region: { code: 'region_code', nameKo: 'region_name_ko', nameEn: 'region_name_en' }
    }
    
    const columns = columnMap[codeType]
    
    // 쿼리 빌드: 코드 또는 이름으로 조회
    let query = supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, property_address')
    
    const conditions: string[] = []
    
    // 코드가 있으면 코드로 조회
    if (code && code.trim()) {
      conditions.push(`${columns.code}.eq.${code}`)
    }
    
    // 이름으로도 조회 (코드가 없거나 추가 매칭을 위해)
    if (nameKo && nameKo.trim()) {
      conditions.push(`${columns.nameKo}.eq.${nameKo}`)
    }
    if (nameEn && nameEn.trim()) {
      conditions.push(`${columns.nameEn}.eq.${nameEn}`)
    }
    
    if (conditions.length === 0) {
      return { success: true, data: { hotels: [] } }
    }
    
    // OR 조건으로 연결
    query = query.or(conditions.join(','))
    query = query.order('property_name_en')
    
    const { data, error } = await query
    
    if (error) {
      console.error(`[regions] get mapped hotels error for ${code}/${nameKo}/${nameEn}:`, error)
      return { success: false, error: '호텔 조회 실패' }
    }
    
    // 중복 제거 (code와 name으로 동시에 매칭될 수 있으므로)
    const uniqueHotels = Array.from(
      new Map(data?.map(h => [h.sabre_id, h]) || []).values()
    )
    
    return { success: true, data: { hotels: uniqueHotels } }
  } catch (e) {
    console.error('[regions] get mapped hotels exception:', e)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * City 이미지 URL 다운로드 및 업로드
 */
export type UploadCityImagesFromUrlsInput = {
  cityCode: string
  cityKo?: string
  cityEn?: string
  urls: string[]
}

export type UploadCityImagesFromUrlsResult = {
  uploaded: number
  total: number
  results: Array<{ url: string; path?: string; error?: string }>
  folderPath: string
}

export async function uploadCityImagesFromUrls(input: UploadCityImagesFromUrlsInput) {
  const supabase = createServiceRoleClient()

  const cityCodeRaw = input?.cityCode
  const urlsRaw = Array.isArray(input?.urls) ? input.urls : []

  if (!cityCodeRaw || typeof cityCodeRaw !== 'string') {
    return { success: false as const, error: 'City Code는 필수입니다.' }
  }
  
  const cityCode = cityCodeRaw.trim()
  const urls = urlsRaw.map((u) => String(u).trim()).filter((u) => u.length > 0).slice(0, 20)
  
  if (urls.length === 0) {
    return { success: false as const, error: '업로드할 이미지 URL을 입력해주세요.' }
  }

  // 도시 정보 확인 (선택사항 - city_code만 있어도 OK)
  const cityKo = input?.cityKo || null
  const cityEn = input?.cityEn || null

  const folderPath = `cities/${cityCode}`

  // ✅ 먼저 테이블의 실제 컬럼 확인
  const { data: schemaTest } = await supabase
    .from('select_city_media')
    .select('*')
    .limit(1)

  const availableColumns = schemaTest && schemaTest.length > 0 ? Object.keys(schemaTest[0]) : []
  console.log('[uploadCityImagesFromUrls] Available columns in select_city_media:', availableColumns)

  // 기존 파일 목록 조회 → 최대 seq 계산
  const { data: existingList, error: listError } = await supabase.storage
    .from('hotel-media')
    .list(folderPath, { limit: 1000 })

  if (listError) {
    console.warn('[uploadCityImagesFromUrls] Storage list warning:', listError)
    // 폴더가 없을 수 있으므로 경고만 출력하고 계속 진행
  }

  // 파일명에서 seq 추출: {cityCode}-{timestamp}
  let maxSeq = 0
  const seqRegex = new RegExp(`^${cityCode}-(\\d+)\\.(jpg|jpeg|png|webp|avif)$`, 'i')
  for (const f of existingList || []) {
    const m = f.name ? f.name.match(seqRegex) : null
    if (m) {
      const timestamp = parseInt(m[1], 10)
      if (Number.isFinite(timestamp) && timestamp > maxSeq) maxSeq = timestamp
    }
  }

  const results: Array<{ url: string; path?: string; error?: string }> = []

  // 각 URL 다운로드 후 업로드
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    try {
      const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(30000) })
      if (!response.ok) {
        results.push({ url, error: `원격 이미지 요청 실패(${response.status})` })
        continue
      }
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const arrayBuffer = await response.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)

      // 파일 크기 제한 (10MB)
      if (buffer.length > 10 * 1024 * 1024) {
        results.push({ url, error: '파일 크기가 10MB를 초과합니다.' })
        continue
      }

      // 타임스탬프 기반 파일명 생성
      const timestamp = Date.now() + i
      const inferredExt = (() => {
        if (contentType.includes('png')) return 'png'
        if (contentType.includes('webp')) return 'webp'
        if (contentType.includes('avif')) return 'avif'
        if (contentType.includes('gif')) return 'gif'
        return 'jpg'
      })()

      const filename = `${cityCode}-${timestamp}.${inferredExt}`
      const storagePath = `${folderPath}/${filename}`

      const { error: uploadError } = await supabase.storage
        .from('hotel-media')
        .upload(storagePath, buffer, {
          contentType,
          upsert: false,
        })

      if (uploadError) {
        results.push({ url, error: `업로드 실패: ${uploadError.message}` })
        continue
      }

      // Public URL 생성
      const { data: publicUrlData } = supabase.storage
        .from('hotel-media')
        .getPublicUrl(storagePath)

      // ✅ select_city_media 테이블에 레코드 Upsert (사용 가능한 컬럼만)
      const mediaRecord: Record<string, unknown> = {
        file_name: filename,
        file_path: storagePath,
        storage_path: storagePath,
        public_url: publicUrlData.publicUrl,
        file_type: contentType,
        file_size: buffer.length,
      }

      // 선택적 컬럼 추가 (테이블에 있는 경우에만)
      if (availableColumns.includes('city_code')) mediaRecord.city_code = cityCode
      if (availableColumns.includes('city_ko')) mediaRecord.city_ko = cityKo
      if (availableColumns.includes('city_en')) mediaRecord.city_en = cityEn
      if (availableColumns.includes('image_seq')) mediaRecord.image_seq = i + 1
      if (availableColumns.includes('original_url')) mediaRecord.original_url = url

      console.log('[uploadCityImagesFromUrls] Attempting to insert media record:', mediaRecord)

      // ✅ 기존 레코드 확인 (사용 가능한 컬럼으로만 조회)
      let existingQuery = supabase
        .from('select_city_media')
        .select('id')
        .eq('file_path', storagePath)
      
      // city_code 컬럼이 있으면 추가 조건으로 사용
      if (availableColumns.includes('city_code')) {
        existingQuery = existingQuery.eq('city_code', cityCode)
      }
      
      const { data: existing } = await existingQuery.maybeSingle()

      if (existing) {
        // ✅ 업데이트 (사용 가능한 컬럼만)
        console.log('[uploadCityImagesFromUrls] 기존 레코드 업데이트:', existing.id)
        
        const updateRecord: Record<string, unknown> = {
          file_name: mediaRecord.file_name,
          storage_path: mediaRecord.storage_path,
          public_url: mediaRecord.public_url,
          file_type: mediaRecord.file_type,
          file_size: mediaRecord.file_size,
        }
        
        if (availableColumns.includes('city_ko') && mediaRecord.city_ko !== undefined) {
          updateRecord.city_ko = mediaRecord.city_ko
        }
        if (availableColumns.includes('city_en') && mediaRecord.city_en !== undefined) {
          updateRecord.city_en = mediaRecord.city_en
        }
        if (availableColumns.includes('image_seq') && mediaRecord.image_seq !== undefined) {
          updateRecord.image_seq = mediaRecord.image_seq
        }
        if (availableColumns.includes('original_url') && mediaRecord.original_url !== undefined) {
          updateRecord.original_url = mediaRecord.original_url
        }
        
        const { error: updateError } = await supabase
          .from('select_city_media')
          .update(updateRecord)
          .eq('id', existing.id)

        if (updateError) {
          console.error('[uploadCityImagesFromUrls] DB 업데이트 오류:', updateError)
          results.push({ url, error: `DB 업데이트 실패: ${updateError.message}` })
          continue
        }
      } else {
        // 삽입
        console.log('[uploadCityImagesFromUrls] 새 레코드 삽입')
        const { error: insertError } = await supabase
          .from('select_city_media')
          .insert(mediaRecord)

        if (insertError) {
          console.error('[uploadCityImagesFromUrls] DB 삽입 오류:', insertError)
          results.push({ url, error: `DB 삽입 실패: ${insertError.message}` })
          continue
        }
      }

      results.push({ url, path: storagePath })
    } catch (err) {
      console.error('[uploadCityImagesFromUrls] 오류:', err)
      const errorMessage = err instanceof Error ? err.message : '다운로드/업로드 중 오류'
      results.push({ url, error: errorMessage })
    }
  }

  const okCount = results.filter((r) => !r.error).length
  
  return {
    success: true as const,
    data: {
      uploaded: okCount,
      total: results.length,
      results,
      folderPath,
    } satisfies UploadCityImagesFromUrlsResult,
  }
}


