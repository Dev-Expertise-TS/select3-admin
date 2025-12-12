import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

async function searchHotels(query: string) {
  const supabase = createServiceRoleClient()
  
  // 빈 검색어인 경우 id_old 값이 큰 순서대로 10개 반환
  if (!query || !query.trim()) {
    const { data, error } = await supabase
      .from('select_hotels')
      .select(`
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
      `)
      .order('id_old', { ascending: false })
      .limit(10)

    if (error) {
      console.error('[hotel/search] empty query error:', error)
      throw error
    }

    return data || []
  }
  
  // Sabre ID, 호텔명 (한글/영문) 검색
  // 특수문자가 포함될 수 있으므로 .or() 대신 개별 쿼리 실행 후 병합
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
  
  const results: any[] = []
  const seenIds = new Set<string>()
  
  // 1. Sabre ID로 검색 (숫자인 경우만)
  if (/^\d+$/.test(query)) {
    const { data: sabreResults, error: sabreError } = await supabase
      .from('select_hotels')
      .select(selectFields)
      .eq('sabre_id', query)
      .limit(50)
    
    if (!sabreError && sabreResults) {
      sabreResults.forEach(item => {
        const id = `${item.sabre_id}-${item.paragon_id}`
        if (!seenIds.has(id)) {
          seenIds.add(id)
          results.push(item)
        }
      })
    }
  }
  
  // 2. 한글명으로 검색
  const { data: koResults, error: koError } = await supabase
    .from('select_hotels')
    .select(selectFields)
    .ilike('property_name_ko', `%${query}%`)
    .limit(50)
  
  if (!koError && koResults) {
    koResults.forEach(item => {
      const id = `${item.sabre_id}-${item.paragon_id}`
      if (!seenIds.has(id)) {
        seenIds.add(id)
        results.push(item)
      }
    })
  }
  
  // 3. 영문명으로 검색
  const { data: enResults, error: enError } = await supabase
    .from('select_hotels')
    .select(selectFields)
    .ilike('property_name_en', `%${query}%`)
    .limit(50)
  
  if (!enError && enResults) {
    enResults.forEach(item => {
      const id = `${item.sabre_id}-${item.paragon_id}`
      if (!seenIds.has(id)) {
        seenIds.add(id)
        results.push(item)
      }
    })
  }
  
  // 에러가 모두 발생한 경우
  if (koError && enError) {
    console.error('[hotel/search] all queries failed:', { koError, enError })
    throw koError || enError
  }
  
  // 결과를 영문명 기준으로 정렬
  results.sort((a, b) => {
    const aName = a.property_name_en || a.property_name_ko || ''
    const bName = b.property_name_en || b.property_name_ko || ''
    return aName.localeCompare(bName)
  })

  return results.slice(0, 50) // 최대 50개로 제한
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')

    const data = await searchHotels(q || '')
    return NextResponse.json({ success: true, data })
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

    const queryString = typeof q === 'string' ? q.trim() : String(q || '').trim()
    const data = await searchHotels(queryString)
    
    // 기존 호환성을 위해 count도 포함
    return NextResponse.json({ success: true, data, count: data.length })
  } catch (e) {
    console.error('[hotel/search] POST exception:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
