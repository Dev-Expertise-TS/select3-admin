import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createErrorResponse, createSuccessResponse } from '@/types/api'
import type { RegionFormInput, RegionsQueryParams, SelectRegion } from '@/types/regions'

// GET /api/regions
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(req.url)

    const page = Number(searchParams.get('page') || '1')
    const pageSize = Number(searchParams.get('pageSize') || '20')
    const type = searchParams.get('type') as RegionsQueryParams['type']
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') as 'active' | 'inactive' | null
    const sortKey = (searchParams.get('sortKey') as RegionsQueryParams['sortKey']) || 'id'
    const sortOrder = (searchParams.get('sortOrder') as RegionsQueryParams['sortOrder']) || 'asc'

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase.from('select_regions').select('*', { count: 'exact' })

    if (type) query = query.eq('region_type', type)
    if (status) query = query.eq('status', status)
    if (search && search.trim() !== '') {
      const q = search.trim()
      query = query.or(
        [
          `area_ko.ilike.%${q}%`,
          `area_en.ilike.%${q}%`,
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

    // type별로 적절한 sort_order 컬럼으로 정렬 (우선순위 1)
    // status 우선 → sort_order → id 순서로 정렬
    query = query.order('status', { ascending: false, nullsFirst: false }) // active가 먼저
    
    if (type === 'city') {
      query = query.order('city_sort_order', { ascending: true, nullsFirst: false })
    } else if (type === 'area') {
      query = query.order('area_sort_order', { ascending: true, nullsFirst: false })
    } else if (type === 'country') {
      query = query.order('country_sort_order', { ascending: true, nullsFirst: false })
    } else if (type === 'continent') {
      query = query.order('continent_sort_order', { ascending: true, nullsFirst: false })
    } else if (type === 'region') {
      query = query.order('region_name_sort_order', { ascending: true, nullsFirst: false })
    }
    
    // 마지막 정렬: id 내림차순 (최신순)
    query = query.order('id', { ascending: false })

    const { data, error, count } = await query.range(from, to)

    if (error) {
      return Response.json(
        createErrorResponse('지역 목록 조회에 실패했습니다.', 'INTERNAL_ERROR'),
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return Response.json(
      createSuccessResponse<SelectRegion[]>(data || [], {
        count: count ?? 0,
        page,
        pageSize,
        totalPages: count ? Math.ceil(count / pageSize) : 0,
      }),
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    return Response.json(
      createErrorResponse('서버 오류가 발생했습니다.', 'INTERNAL_ERROR'),
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

// POST /api/regions
export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const body = (await req.json()) as RegionFormInput

    if (!body?.region_type) {
      return Response.json(createErrorResponse('region_type은 필수입니다.', 'VALIDATION_ERROR'), { status: 400 })
    }

    const normalizeString = (v: unknown) => {
      if (v === null || v === undefined) return null
      const s = String(v).trim()
      return s === '' ? null : s
    }
    const normalizeNumber = (v: unknown) => {
      if (v === null || v === undefined || v === '') return null
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }

    const payload = {
      region_type: body.region_type,
      area_ko: normalizeString(body.area_ko),
      area_en: normalizeString(body.area_en),
      area_sort_order: normalizeString(body.area_sort_order), // text 타입이므로 normalizeString 사용
      city_ko: normalizeString(body.city_ko),
      city_en: normalizeString(body.city_en),
      city_sort_order: normalizeNumber(body.city_sort_order),
      country_ko: normalizeString(body.country_ko),
      country_en: normalizeString(body.country_en),
      country_sort_order: normalizeNumber(body.country_sort_order),
      continent_ko: normalizeString(body.continent_ko),
      continent_en: normalizeString(body.continent_en),
      continent_sort_order: normalizeNumber(body.continent_sort_order),
      region_name_ko: normalizeString(body.region_name_ko),
      region_name_en: normalizeString(body.region_name_en),
      region_name_sort_order: normalizeNumber(body.region_name_sort_order),
    }

    const { data, error } = await supabase.from('select_regions').insert(payload).select('*').single()
    if (error) {
      return Response.json(createErrorResponse('생성에 실패했습니다.', 'INTERNAL_ERROR'), { status: 500 })
    }

    return Response.json(createSuccessResponse<SelectRegion>(data), { status: 201 })
  } catch (e) {
    return Response.json(createErrorResponse('서버 오류가 발생했습니다.', 'INTERNAL_ERROR'), { status: 500 })
  }
}

// PATCH /api/regions?id=123
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))
    if (!id || id <= 0) {
      return Response.json(createErrorResponse('유효한 id가 필요합니다.', 'VALIDATION_ERROR'), { status: 400 })
    }

    const body = (await req.json()) as RegionFormInput

    const normalizeString = (v: unknown) => {
      if (v === null || v === undefined) return null
      const s = String(v).trim()
      return s === '' ? null : s
    }
    const normalizeNumber = (v: unknown) => {
      if (v === null || v === undefined || v === '') return null
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }

    const payload = {
      region_type: body.region_type,
      area_ko: normalizeString(body.area_ko),
      area_en: normalizeString(body.area_en),
      area_sort_order: normalizeString(body.area_sort_order), // text 타입이므로 normalizeString 사용
      city_ko: normalizeString(body.city_ko),
      city_en: normalizeString(body.city_en),
      city_sort_order: normalizeNumber(body.city_sort_order),
      country_ko: normalizeString(body.country_ko),
      country_en: normalizeString(body.country_en),
      country_sort_order: normalizeNumber(body.country_sort_order),
      continent_ko: normalizeString(body.continent_ko),
      continent_en: normalizeString(body.continent_en),
      continent_sort_order: normalizeNumber(body.continent_sort_order),
      region_name_ko: normalizeString(body.region_name_ko),
      region_name_en: normalizeString(body.region_name_en),
      region_name_sort_order: normalizeNumber(body.region_name_sort_order),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('select_regions')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()
    if (error) {
      return Response.json(createErrorResponse('수정에 실패했습니다.', 'INTERNAL_ERROR'), { status: 500 })
    }

    return Response.json(createSuccessResponse<SelectRegion>(data), { status: 200 })
  } catch (e) {
    return Response.json(createErrorResponse('서버 오류가 발생했습니다.', 'INTERNAL_ERROR'), { status: 500 })
  }
}

// DELETE /api/regions?id=123
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))
    if (!id || id <= 0) {
      return Response.json(createErrorResponse('유효한 id가 필요합니다.', 'VALIDATION_ERROR'), { status: 400 })
    }

    const { error } = await supabase.from('select_regions').delete().eq('id', id)
    if (error) {
      return Response.json(createErrorResponse('삭제에 실패했습니다.', 'INTERNAL_ERROR'), { status: 500 })
    }

    return new Response(null, { status: 204 })
  } catch (e) {
    return Response.json(createErrorResponse('서버 오류가 발생했습니다.', 'INTERNAL_ERROR'), { status: 500 })
  }
}


