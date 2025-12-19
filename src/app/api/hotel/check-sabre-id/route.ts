import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const sabreId = request.nextUrl.searchParams.get('sabreId')

    if (!sabreId || !sabreId.trim()) {
      return NextResponse.json(
        { success: false, error: 'sabreId가 필요합니다.' },
        { status: 400 },
      )
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_hotels')
      .select('sabre_id')
      .eq('sabre_id', sabreId.trim())
      .maybeSingle()

    if (error) {
      console.error('[hotel/check-sabre-id] error:', error)
      return NextResponse.json(
        { success: false, error: `조회 실패: ${error.message}` },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        sabreId: sabreId.trim(),
        exists: Boolean(data),
      },
    })
  } catch (e) {
    console.error('[hotel/check-sabre-id] unhandled:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : '알 수 없는 오류' },
      { status: 500 },
    )
  }
}


