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

    // 호텔 검색 쿼리 실행
    // property_name_kor, property_name_eng에서 ILIKE 검색 수행
    // paragon_id, sabre_id는 숫자 정확 매치로 검색 (숫자로 변환 가능한 경우만)
    let query = supabase
      .from('select_hotels')
      .select('sabre_id, paragon_id, property_name_kor, property_name_eng, rate_plan_codes', { count: 'exact' });

    // 검색어가 숫자인지 확인
    const isNumericSearch = /^\d+$/.test(searchTerm);
    
    if (isNumericSearch) {
      // 숫자 검색어인 경우: 텍스트 필드 + ID 필드 모두 검색
      query = query.or(`property_name_kor.ilike.%${searchTerm}%,property_name_eng.ilike.%${searchTerm}%,paragon_id.eq.${searchTerm},sabre_id.eq.${searchTerm}`);
    } else {
      // 텍스트 검색어인 경우: 텍스트 필드만 검색
      query = query.or(`property_name_kor.ilike.%${searchTerm}%,property_name_eng.ilike.%${searchTerm}%`);
    }
    
    const { data, error, count } = await query.order('property_name_kor', { ascending: true });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Database query failed'
        },
        { status: 500 }
      );
    }

    // 성공 응답
    return NextResponse.json<ApiResponse<HotelSearchResult[]>>(
      {
        success: true,
        data: data || [],
        count: count || 0
      },
      { 
        status: 200,
        headers: {
          // CORS 헤더 설정 (필요시)
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );

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