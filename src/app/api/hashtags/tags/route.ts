import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId') || searchParams.get('category_id')
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')

    const supabase = createServiceRoleClient()

    let query = supabase
      .from('select_tags')
      .select(`
        *,
        category:select_tag_categories(*)
      `)
      .order('weight', { ascending: false })
      .order('name_ko', { ascending: true })

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (isActive === 'true') {
      query = query.eq('is_active', true)
    }

    if (search && search.trim()) {
      query = query.or(`name_ko.ilike.%${search}%,name_en.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('태그 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '태그를 조회할 수 없습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (err) {
    console.error('태그 조회 중 오류:', err)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

