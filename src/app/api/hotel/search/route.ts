import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

async function searchHotels(query: string) {
  const supabase = createServiceRoleClient()
  
  // 빈 검색어인 경우 id_old 값이 큰 순서대로 10개 반환
  if (!query || !query.trim()) {
    const { data, error } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, property_address, rate_plan_code, paragon_id, brand_id, id_old')
      .order('id_old', { ascending: false })
      .limit(10)

    if (error) {
      console.error('[hotel/search] empty query error:', error)
      throw error
    }

    return data || []
  }
  
  // Sabre ID, 호텔명 (한글/영문) 검색
  // sabre_id는 bigint이므로 정확히 일치하는 경우만 검색, 호텔명은 ilike로 부분 일치 검색
  let queryBuilder = supabase
    .from('select_hotels')
    .select('sabre_id, property_name_ko, property_name_en, property_address, rate_plan_code, paragon_id, brand_id, id_old')
  
  // 숫자인 경우 sabre_id로도 검색
  if (/^\d+$/.test(query)) {
    queryBuilder = queryBuilder.or(`sabre_id.eq.${query},property_name_ko.ilike.%${query}%,property_name_en.ilike.%${query}%`)
  } else {
    queryBuilder = queryBuilder.or(`property_name_ko.ilike.%${query}%,property_name_en.ilike.%${query}%`)
  }
  
  const { data, error } = await queryBuilder
    .limit(50)
    .order('property_name_en')

  if (error) {
    console.error('[hotel/search] error:', error)
    throw error
  }

  return data || []
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
