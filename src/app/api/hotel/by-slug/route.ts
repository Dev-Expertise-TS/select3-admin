import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * slug로 호텔 조회 (luxury-select.co.kr /hotel/[slug] 페이지용)
 * - 동일 slug가 여러 행일 경우 publish=true인 행 우선 반환
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug || !slug.trim()) {
      return NextResponse.json(
        { success: false, error: 'slug가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // slug로 조회, publish=true 우선 (여러 행일 수 있음)
    const { data: hotels, error } = await supabase
      .from('select_hotels')
      .select('*')
      .eq('slug', slug.trim())

    if (error) {
      console.error('[hotel/by-slug] 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '호텔 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    if (!hotels || hotels.length === 0) {
      return NextResponse.json(
        { success: false, error: '호텔을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // publish=true 우선, 없으면 첫 번째
    const hotel =
      hotels.find((h) => h.publish === true) ??
      hotels.find((h) => h.publish !== false) ??
      hotels[0]

    return NextResponse.json({
      success: true,
      data: hotel,
    })
  } catch (error) {
    console.error('[hotel/by-slug] API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
