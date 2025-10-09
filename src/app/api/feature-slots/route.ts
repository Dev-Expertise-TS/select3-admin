import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET: Feature Slots 목록 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const surface = searchParams.get('surface')

    const supabase = createServiceRoleClient()

    let query = supabase
      .from('select_feature_slots')
      .select(`
        id,
        sabre_id,
        surface,
        slot_key,
        start_date,
        end_date,
        created_at,
        select_hotels (
          property_name_ko,
          property_name_en
        )
      `)
      .order('created_at', { ascending: false })

    // surface 필터링 (선택사항)
    if (surface) {
      query = query.eq('surface', surface)
    }

    const { data, error } = await query

    if (error) {
      console.error('[feature-slots] 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: `조회에 실패했습니다: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (e) {
    console.error('[feature-slots] exception:', e)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
