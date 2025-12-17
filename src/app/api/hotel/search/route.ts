import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

async function searchHotels(query: string, limit: number = 20, offset: number = 0) {
  const supabase = createServiceRoleClient()
  
  const selectFields = `
    sabre_id, 
    property_name_ko, 
    property_name_en, 
    property_address, 
    rate_plan_code, 
    paragon_id, 
    brand_id, 
    id_old,
    slug,
    hotel_brands(
      brand_id,
      brand_name_ko,
      brand_name_en,
      chain_id,
      hotel_chains(
        chain_id,
        chain_name_ko,
        chain_name_en
      )
    )
  `
  
  // 빈 검색어인 경우 id_old 값이 큰 순서대로 반환
  if (!query || !query.trim()) {
    // 전체 개수 조회
    const { count, error: countError } = await supabase
      .from('select_hotels')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('[hotel/search] count error:', countError)
      throw countError
    }
    
    // 데이터 조회
    const { data, error } = await supabase
      .from('select_hotels')
      .select(selectFields)
      .order('id_old', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[hotel/search] empty query error:', error)
      throw error
    }

    return { data: data || [], count: count || 0 }
  }
  
  // Sabre ID, 호텔명 (한글/영문) 검색
  // 특수문자가 포함될 수 있으므로 .or() 대신 개별 쿼리 실행 후 병합
  const allResults: any[] = []
  const allSeenIds = new Set<string>()
  
  // 1. Sabre ID로 검색 (숫자인 경우만)
  if (/^\d+$/.test(query)) {
    const { data: sabreResults, error: sabreError } = await supabase
      .from('select_hotels')
      .select(selectFields)
      .eq('sabre_id', query)
    
    if (!sabreError && sabreResults) {
      sabreResults.forEach(item => {
        const id = `${item.sabre_id}-${item.paragon_id}`
        if (!allSeenIds.has(id)) {
          allSeenIds.add(id)
          allResults.push(item)
        }
      })
    }
  }
  
  // 2. 한글명으로 검색
  const { data: koResults, error: koError } = await supabase
    .from('select_hotels')
    .select(selectFields)
    .ilike('property_name_ko', `%${query}%`)
  
  if (!koError && koResults) {
    koResults.forEach(item => {
      const id = `${item.sabre_id}-${item.paragon_id}`
      if (!allSeenIds.has(id)) {
        allSeenIds.add(id)
        allResults.push(item)
      }
    })
  }
  
  // 3. 영문명으로 검색
  const { data: enResults, error: enError } = await supabase
    .from('select_hotels')
    .select(selectFields)
    .ilike('property_name_en', `%${query}%`)
  
  if (!enError && enResults) {
    enResults.forEach(item => {
      const id = `${item.sabre_id}-${item.paragon_id}`
      if (!allSeenIds.has(id)) {
        allSeenIds.add(id)
        allResults.push(item)
      }
    })
  }
  
  // 에러가 모두 발생한 경우
  if (koError && enError && (!/^\d+$/.test(query) || sabreError)) {
    console.error('[hotel/search] all queries failed:', { koError, enError, sabreError })
    throw koError || enError || sabreError
  }
  
  // 결과를 영문명 기준으로 정렬
  allResults.sort((a, b) => {
    const aName = a.property_name_en || a.property_name_ko || ''
    const bName = b.property_name_en || b.property_name_ko || ''
    return aName.localeCompare(bName)
  })

  // 전체 개수
  const totalCount = allResults.length
  
  // 페이지네이션 적용
  const paginatedResults = allResults.slice(offset, offset + limit)

  return { data: paginatedResults, count: totalCount }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await searchHotels(q || '', limit, offset)
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      meta: {
        count: result.count,
        limit,
        offset,
      }
    })
  } catch (e) {
    console.error('[hotel/search] GET exception:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // q 또는 searching_string 둘 다 지원
    const q = body.q || body.searching_string
    const limit = body.limit || 20
    const offset = body.offset || 0

    const queryString = typeof q === 'string' ? q.trim() : String(q || '').trim()
    const result = await searchHotels(queryString, limit, offset)
    
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      meta: {
        count: result.count,
        limit,
        offset,
      }
    })
  } catch (e) {
    console.error('[hotel/search] POST exception:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
