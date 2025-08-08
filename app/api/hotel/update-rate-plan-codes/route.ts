import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/types/hotel';

// 요청 타입 정의
interface UpdateRatePlanCodesRequest {
  sabre_id: string;
  paragon_id: string;
  rate_plan_codes: string[];
}

export async function PATCH(request: NextRequest) {
  try {
    // 요청 Body 파싱 및 검증
    const body: UpdateRatePlanCodesRequest = await request.json();
    
    if (!body.sabre_id && !body.paragon_id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'sabre_id or paragon_id is required'
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.rate_plan_codes)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'rate_plan_codes must be an array'
        },
        { status: 400 }
      );
    }

    // Supabase 관리자 클라이언트 생성
    const supabase = createServiceRoleClient();

    // 호텔 레코드 찾기 및 업데이트 (sabre_id 또는 paragon_id로 검색)
    let query = supabase
      .from('hotel')
      .update({ rate_plan_codes: body.rate_plan_codes });

    // sabre_id가 우선, 없으면 paragon_id 사용
    if (body.sabre_id) {
      query = query.eq('sabre_id', body.sabre_id);
    } else {
      query = query.eq('paragon_id', body.paragon_id);
    }

    const { data, error } = await query
      .select('sabre_id, paragon_id, property_name_kor, property_name_eng, rate_plan_codes')
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: error.code === 'PGRST116' ? 'Hotel not found' : 'Database update failed'
        },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      );
    }

    // 성공 응답
    return NextResponse.json<ApiResponse<typeof data>>(
      {
        success: true,
        data: data,
        count: 1
      },
      { 
        status: 200,
        headers: {
          // CORS 헤더 설정
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
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
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}