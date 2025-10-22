import { NextResponse } from 'next/server';
import { RatePlanCodesApiResponse } from '@/types/hotel';
import { RATE_PLAN_CODES } from '@/config/rate-plan-codes';

export async function GET() {
  try {
    return NextResponse.json<RatePlanCodesApiResponse>(
      {
        success: true,
        data: [...RATE_PLAN_CODES],
        meta: {
          count: RATE_PLAN_CODES.length
        }
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