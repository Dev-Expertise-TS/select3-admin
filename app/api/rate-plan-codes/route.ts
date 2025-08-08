import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { RatePlanCodesApiResponse } from '@/types/hotel';

export async function GET() {
  try {
    // Supabase 관리자 클라이언트 생성
    const supabase = createServiceRoleClient();

    // 1단계: pg_type에서 rate_plan_code enum의 OID를 찾기
    const { data: typeData, error: typeError } = await supabase
      .from('pg_type')
      .select('oid')
      .eq('typname', 'rate_plan_code')
      .single();

    if (typeError || !typeData) {
      console.error('pg_type query error:', typeError);
      
      // fallback: 실제 데이터베이스에서 사용되는 rate plan code 값들
      const fallbackValues = ['API', 'ZP3', 'VMC', 'TLC', 'H01', 'S72', 'XLO', 'PPR', 'FAN', 'WMP', 'HPM', 'TID', 'STP'];
      
      return NextResponse.json<RatePlanCodesApiResponse>(
        {
          success: true,
          data: fallbackValues,
          count: fallbackValues.length
        },
        { 
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'public, max-age=3600'
          }
        }
      );
    }

    // 2단계: pg_enum에서 해당 OID의 enum 값들 조회
    const { data: enumData, error } = await supabase
      .from('pg_enum')
      .select('enumlabel')
      .eq('enumtypid', typeData.oid)
      .order('enumsortorder', { ascending: true });

    if (error) {
      console.error('pg_enum query error:', error);
      
      // fallback: 실제 데이터베이스에서 사용되는 rate plan code 값들
      const fallbackValues = ['API', 'ZP3', 'VMC', 'TLC', 'H01', 'S72', 'XLO', 'PPR', 'FAN', 'WMP', 'HPM', 'TID', 'STP'];
      
      return NextResponse.json<RatePlanCodesApiResponse>(
        {
          success: true,
          data: fallbackValues,
          count: fallbackValues.length
        },
        { 
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'public, max-age=3600'
          }
        }
      );
    }

    // enum 데이터에서 enumlabel 값들을 추출
    const enumValues = enumData?.map((item: { enumlabel: string }) => item.enumlabel).filter(Boolean) || [];
    
    // 값이 없는 경우 fallback 사용
    if (enumValues.length === 0) {
      console.warn('No enum values found for rate_plan_code, using fallback values');
      const fallbackValues = ['API', 'ZP3', 'VMC', 'TLC', 'H01', 'S72', 'XLO', 'PPR', 'FAN', 'WMP', 'HPM', 'TID', 'STP'];
      
      return NextResponse.json<RatePlanCodesApiResponse>(
        {
          success: true,
          data: fallbackValues,
          count: fallbackValues.length
        },
        { 
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'public, max-age=3600'
          }
        }
      );
    }
    
    return NextResponse.json<RatePlanCodesApiResponse>(
      {
        success: true,
        data: enumValues,
        count: enumValues.length
      },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=1800' // 30분 캐시
        }
      }
    );

  } catch (error) {
    console.error('API route error:', error);
    
    return NextResponse.json<RatePlanCodesApiResponse>(
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}