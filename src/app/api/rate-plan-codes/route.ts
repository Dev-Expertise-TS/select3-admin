import { NextResponse } from 'next/server';
import { RatePlanCodesApiResponse } from '@/types/hotel';

export async function GET() {
  try {
    // 정적 rate plan code 값들 (Supabase pg_type 이슈 방지)
    const ratePlanCodes = [
      'API', 'ZP3', 'VMC', 'TLC', 'H01', 'S72', 'XLO', 'PPR', 
      'FAN', 'WMP', 'HPM', 'TID', 'STP', 'BAR', 'RAC', 'PKG'
    ];
    
    return NextResponse.json<RatePlanCodesApiResponse>(
      {
        success: true,
        data: ratePlanCodes,
        count: ratePlanCodes.length
      },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=3600' // 1시간 캐시
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