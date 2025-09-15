import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { sabre_id, updates } = body
    
    if (!sabre_id) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID가 필요합니다' },
        { status: 400 }
      )
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: '업데이트할 데이터가 없습니다' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    
    // id, created_at은 제외 (updated_at 컬럼이 없음)
    const { id, created_at, ...allowedUpdates } = updates;
    
    // 호텔 데이터 업데이트
    const { data, error } = await supabase
      .from('select_hotels')
      .update(allowedUpdates)
      .eq('sabre_id', sabre_id)
      .select()
      .single()

    if (error) {
      console.error('호텔 데이터 업데이트 오류:', error)
      return NextResponse.json(
        { success: false, error: '호텔 데이터 업데이트 중 오류가 발생했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data, message: '호텔 데이터가 성공적으로 업데이트되었습니다' },
      { status: 200 }
    )

  } catch (error) {
    console.error('호텔 데이터 업데이트 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
