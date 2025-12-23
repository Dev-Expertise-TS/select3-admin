import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * 고객 만족도 설문 정렬 순서 일괄 업데이트
 * POST /api/satisfaction-survey/bulk-update-sort
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { updates } = body as { updates: Array<{ id: number; sort: number }> }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'updates 배열이 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // 각 레코드의 sort 값 업데이트
    const updatePromises = updates.map(({ id, sort }) =>
      supabase
        .from('select_satisfaction_survey')
        .update({ sort })
        .eq('id', id)
    )

    const results = await Promise.all(updatePromises)
    
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('[bulk-update-sort] 일부 업데이트 실패:', errors)
      return NextResponse.json(
        {
          success: false,
          error: `${errors.length}개의 레코드 업데이트에 실패했습니다.`,
        },
        { status: 500 }
      )
    }

    console.log(`[bulk-update-sort] ${updates.length}개 레코드 정렬 순서 업데이트 완료`)

    return NextResponse.json({
      success: true,
      data: {
        updated: updates.length,
      },
    })
  } catch (error) {
    console.error('[bulk-update-sort] 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: '정렬 순서 업데이트 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}











