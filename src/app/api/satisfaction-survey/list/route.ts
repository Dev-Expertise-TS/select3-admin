import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * 고객 만족도 설문 목록 조회
 * GET /api/satisfaction-survey/list
 */
export async function GET() {
  try {
    console.log('🚀 고객 만족도 목록 조회 API 시작')
    
    const supabase = createServiceRoleClient()
    console.log('✅ Supabase 클라이언트 생성 완료')

    const { data, error } = await supabase
      .from('select_satisfaction_survey')
      .select('*')
      .order('sort', { ascending: true, nullsFirst: false })
      .order('submitted_at', { ascending: false })

    console.log('📊 Supabase 쿼리 결과:', { data: data?.length || 0, error })

    if (error) {
      console.error('❌ 고객 만족도 목록 조회 오류:', error)
      return NextResponse.json(
        {
          success: false,
          error: '데이터를 불러오는데 실패했습니다.',
          details: error.message,
        },
        { status: 500 }
      )
    }

    console.log('✅ 고객 만족도 목록 조회 성공:', data?.length || 0, '개')
    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('❌ 고객 만족도 목록 조회 중 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    )
  }
}

