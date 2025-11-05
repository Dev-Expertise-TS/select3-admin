import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/hashtags/categories
 * 태그 카테고리 목록 조회
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_tag_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name_ko', { ascending: true })

    if (error) {
      console.error('카테고리 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '카테고리를 조회할 수 없습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    )
  } catch (err) {
    console.error('카테고리 조회 중 오류:', err)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
