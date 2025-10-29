import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TopicPageApiResponse } from '@/types/topic-page'

export const dynamic = 'force-dynamic'

/**
 * GET /api/topic-pages/list
 * 토픽 페이지 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // draft, published, archived
    const search = searchParams.get('search') // slug, title_ko 검색

    const supabase = await createClient()

    let query = supabase
      .from('select_topic_pages')
      .select(`
        *,
        hotel_count:select_topic_page_hotels(count)
      `)
      .order('created_at', { ascending: false })

    // 상태 필터
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // 검색
    if (search && search.trim()) {
      query = query.or(`slug.ilike.%${search}%,title_ko.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ 토픽 페이지 목록 조회 실패:', error)
      return NextResponse.json<TopicPageApiResponse>(
        {
          success: false,
          error: '토픽 페이지 목록을 조회하는데 실패했습니다.',
        },
        { status: 500 }
      )
    }

    // hotel_count 정규화
    const normalizedData = data?.map((page) => ({
      ...page,
      hotel_count: page.hotel_count?.[0]?.count || 0,
    }))

    return NextResponse.json<TopicPageApiResponse>({
      success: true,
      data: normalizedData || [],
      meta: {
        count: normalizedData?.length || 0,
      },
    })
  } catch (error) {
    console.error('❌ 토픽 페이지 목록 조회 중 예외 발생:', error)
    return NextResponse.json<TopicPageApiResponse>(
      {
        success: false,
        error: '서버 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

