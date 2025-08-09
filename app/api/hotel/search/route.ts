import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SearchHotelRequest, HotelSearchResult, ApiResponse } from '@/types/hotel';

export async function POST(request: NextRequest) {
  try {
    // 요청 Body 파싱 및 검증
    const body: SearchHotelRequest = await request.json();
    
    if (!body.searching_string) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'searching_string is required'
        },
        { status: 400 }
      );
    }

    if (typeof body.searching_string !== 'string') {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'searching_string must be a string'
        },
        { status: 400 }
      );
    }

    // 검색어가 비어있는 경우 체크
    const searchTerm = body.searching_string.trim();
    if (!searchTerm) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'searching_string cannot be empty'
        },
        { status: 400 }
      );
    }

    // Supabase 관리자 클라이언트 생성
    const supabase = createServiceRoleClient();

    // or() 사용 시 검색어에 ','가 포함되면 구문 오류를 유발할 수 있어 병렬 쿼리 후 병합 방식으로 변경
    const baseSelect = 'sabre_id, paragon_id, property_name_kor, property_name_eng, rate_plan_codes'
    const isNumericSearch = /^\d+$/.test(searchTerm)

    const tasks: Promise<{ data: any[] | null; error: any }>[] = []
    // 한글명
    tasks.push(
      supabase
        .from('select_hotels')
        .select(baseSelect)
        .ilike('property_name_kor', `%${searchTerm}%`)
        .limit(200)
    )
    // 영문명
    tasks.push(
      supabase
        .from('select_hotels')
        .select(baseSelect)
        .ilike('property_name_eng', `%${searchTerm}%`)
        .limit(200)
    )
    // 숫자일 경우 ID 정확 매치도 포함
    if (isNumericSearch) {
      tasks.push(
        supabase
          .from('select_hotels')
          .select(baseSelect)
          .eq('sabre_id', Number(searchTerm))
          .limit(200)
      )
      tasks.push(
        supabase
          .from('select_hotels')
          .select(baseSelect)
          .eq('paragon_id', Number(searchTerm))
          .limit(200)
      )
    }

    const results = await Promise.all(tasks)
    const firstError = results.find((r) => r.error)?.error
    if (firstError) {
      console.error('Supabase query error (merged):', firstError)
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Database query failed' }, { status: 500 })
    }

    // 병합 및 중복 제거 (sabre_id-paragon_id 기준)
    type Row = { sabre_id: string | null; paragon_id: string | null; property_name_kor: string | null; property_name_eng: string | null; rate_plan_codes: string[] | null }
    const merged: Row[] = []
    const seen = new Set<string>()
    for (const r of results) {
      for (const row of (r.data as Row[] | null) ?? []) {
        const key = `${row.sabre_id ?? 'null'}-${row.paragon_id ?? 'null'}`
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(row)
      }
    }

    // 정렬: 한글명 우선, 없으면 영문명
    merged.sort((a, b) => {
      const ak = a.property_name_kor ?? a.property_name_eng ?? ''
      const bk = b.property_name_kor ?? b.property_name_eng ?? ''
      return ak.localeCompare(bk)
    })

    return NextResponse.json<ApiResponse<HotelSearchResult[]>>({ success: true, data: merged, count: merged.length }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('API route error:', error);
    
    // JSON 파싱 오류 등 처리
    if (error instanceof SyntaxError) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid JSON format'
        },
        { status: 400 }
      );
    }

    // 기타 예상치 못한 오류
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// OPTIONS 메소드 처리 (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}