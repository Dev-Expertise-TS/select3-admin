import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// 공통 검색 함수
async function searchHotels(query: string) {
  const supabase = createServiceRoleClient()
  
  // 빈 검색어인 경우 초기 호텔 목록 반환 (최근 50개)
  if (!query || query.trim().length === 0) {
    const { data, error } = await supabase
      .from('select_hotels')
      .select(`
        sabre_id,
        property_name_ko,
        property_name_en
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('초기 호텔 목록 조회 오류:', error)
      return {
        success: false,
        error: '초기 호텔 목록을 불러올 수 없습니다.',
        status: 500
      }
    }

    return {
      success: true,
      data: data || [],
      count: data?.length || 0,
      status: 200
    }
  }

  const trimmedQuery = query.trim()

  // 쉼표가 포함된 검색어의 경우 별도 쿼리 실행 (아키텍처 가이드 준수)
  if (trimmedQuery.includes(',')) {
    const queries = trimmedQuery.split(',').map(q => q.trim()).filter(q => q.length > 0)
    
    if (queries.length === 0) {
      return {
        success: false,
        error: '검색어를 입력해주세요.',
        status: 400
      }
    }

    // 각 검색어에 대해 별도 쿼리 실행 (sabre_id 검색 포함)
    const allResults = []
    for (const searchTerm of queries) {
      const isNumeric = !isNaN(Number(searchTerm))
      
      if (isNumeric) {
        // 숫자인 경우: sabre_id 정확 일치 또는 호텔명 부분 일치
        const { data: numericData, error: numericError } = await supabase
          .from('select_hotels')
          .select(`
            sabre_id,
            property_name_ko,
            property_name_en
          `)
          .or(`sabre_id.eq.${searchTerm},property_name_ko.ilike.%${searchTerm}%,property_name_en.ilike.%${searchTerm}%`)
          .limit(25)

        if (numericError) {
          console.error('숫자 검색 오류:', numericError)
          continue
        }

        allResults.push(...(numericData || []))
      } else {
        // 문자열인 경우: 호텔명만 부분 일치
        const { data: koData, error: koError } = await supabase
          .from('select_hotels')
          .select(`
            sabre_id,
            property_name_ko,
            property_name_en
          `)
          .ilike('property_name_ko', `%${searchTerm}%`)
          .limit(25)

        if (koError) {
          console.error('한국어 호텔 검색 오류:', koError)
          continue
        }

        const { data: enData, error: enError } = await supabase
          .from('select_hotels')
          .select(`
            sabre_id,
            property_name_ko,
            property_name_en
          `)
          .ilike('property_name_en', `%${searchTerm}%`)
          .limit(25)

        if (enError) {
          console.error('영어 호텔 검색 오류:', enError)
          continue
        }

        allResults.push(...(koData || []), ...(enData || []))
      }
    }

    // 중복 제거 (sabre_id 기준)
    const uniqueResults = allResults.filter((hotel, index, self) => 
      index === self.findIndex(h => h.sabre_id === hotel.sabre_id)
    )

    return {
      success: true,
      data: uniqueResults.sort((a, b) => a.property_name_ko.localeCompare(b.property_name_ko)),
      count: uniqueResults.length,
      status: 200
    }
  }

  // 단일 검색어의 경우 - 숫자인지 확인하여 sabre_id 검색 포함
  const isNumeric = !isNaN(Number(trimmedQuery))
  
  let searchQuery
  if (isNumeric) {
    // 숫자인 경우: sabre_id 정확 일치 또는 호텔명 부분 일치
    searchQuery = supabase
      .from('select_hotels')
      .select(`
        sabre_id,
        property_name_ko,
        property_name_en
      `)
      .or(`sabre_id.eq.${trimmedQuery},property_name_ko.ilike.%${trimmedQuery}%,property_name_en.ilike.%${trimmedQuery}%`)
  } else {
    // 문자열인 경우: 호텔명만 부분 일치
    searchQuery = supabase
      .from('select_hotels')
      .select(`
        sabre_id,
        property_name_ko,
        property_name_en
      `)
      .or(`property_name_ko.ilike.%${trimmedQuery}%,property_name_en.ilike.%${trimmedQuery}%`)
  }

  const { data, error } = await searchQuery
    .order('property_name_ko', { ascending: true })
    .limit(50)

  if (error) {
    console.error('호텔 검색 오류:', error)
    return {
      success: false,
      error: '호텔 검색 중 오류가 발생했습니다.',
      status: 500
    }
  }

  return {
    success: true,
    data: data || [],
    count: data?.length || 0,
    status: 200
  }
}

// GET: 호텔명으로 호텔 검색 (URL 쿼리 파라미터)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    console.log('호텔 검색 API 호출:', { query, url: request.url })

    const result = await searchHotels(query || '')
    
    return NextResponse.json(
      { 
        success: result.success, 
        data: result.data,
        count: result.count,
        error: result.error
      },
      { status: result.status }
    )

  } catch (error) {
    console.error('호텔 검색 API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}

// POST: 호텔명으로 호텔 검색 (요청 본문)
export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱 시도
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError)
      return NextResponse.json(
        { 
          success: false, 
          error: '잘못된 요청 형식입니다.' 
        },
        { status: 400 }
      )
    }

    // 요청 본문 검증
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { 
          success: false, 
          error: '요청 본문이 올바르지 않습니다.' 
        },
        { status: 400 }
      )
    }

    // 두 가지 필드명 지원: 'q' 또는 'searching_string'
    const query = body.q || body.searching_string

    // 검색어 타입 검증
    if (query !== undefined && typeof query !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: '검색어는 문자열이어야 합니다.' 
        },
        { status: 400 }
      )
    }

    const result = await searchHotels(query || '')
    
    return NextResponse.json(
      { 
        success: result.success, 
        data: result.data,
        count: result.count,
        error: result.error
      },
      { status: result.status }
    )

  } catch (error) {
    console.error('호텔 검색 API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}