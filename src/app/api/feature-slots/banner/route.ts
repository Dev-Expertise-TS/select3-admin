import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET: Banner Feature Slots 목록 조회
export async function GET(_req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
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
          property_name_en,
          slug
        )
      `)
      .eq('surface', '상단베너')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[feature-slots/banner] 조회 오류:', error)
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
    console.error('[feature-slots/banner] exception:', e)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
