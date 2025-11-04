import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TopicPageApiResponse, CreateTopicPageRequest } from '@/types/topic-page'

export const dynamic = 'force-dynamic'

/**
 * GET /api/topic-pages?id=xxx
 * 토픽 페이지 단일 조회
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const slug = searchParams.get('slug')

    if (!id && !slug) {
      return NextResponse.json<TopicPageApiResponse>(
        { success: false, error: 'id 또는 slug가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    let query = supabase
      .from('select_topic_pages')
      .select(`
        *,
        hotels:select_topic_page_hotels(
          *,
          hotel:select_hotels(
            sabre_id,
            property_name_ko,
            property_name_en,
            city_ko,
            country_ko
          )
        )
      `)

    if (id) {
      query = query.eq('id', id)
    } else if (slug) {
      query = query.eq('slug', slug)
    }

    const { data, error } = await query.single()

    if (error) {
      console.error('❌ 토픽 페이지 조회 실패:', error)
      return NextResponse.json<TopicPageApiResponse>(
        { success: false, error: '토픽 페이지를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // hotels 정규화 (Supabase 조인 결과는 배열로 반환됨)
    const normalizedData = {
      ...data,
      hotels: data.hotels?.map((item) => ({
        ...item,
        hotel: Array.isArray(item.hotel) && item.hotel.length > 0 ? item.hotel[0] : null,
      })),
    }

    return NextResponse.json<TopicPageApiResponse>({
      success: true,
      data: normalizedData,
    })
  } catch (error) {
    console.error('❌ 토픽 페이지 조회 중 예외 발생:', error)
    return NextResponse.json<TopicPageApiResponse>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/topic-pages
 * 토픽 페이지 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateTopicPageRequest = await request.json()

    // 필수 필드 검증
    if (!body.slug || !body.title_ko) {
      return NextResponse.json<TopicPageApiResponse>(
        { success: false, error: 'slug와 title_ko는 필수입니다.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // slug 중복 체크
    const { data: existing } = await supabase
      .from('select_topic_pages')
      .select('id')
      .eq('slug', body.slug)
      .single()

    if (existing) {
      return NextResponse.json<TopicPageApiResponse>(
        { success: false, error: '이미 존재하는 slug입니다.' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('select_topic_pages')
      .insert({
        slug: body.slug,
        title_ko: body.title_ko,
        where_countries: body.where_countries || null,
        where_cities: body.where_cities || null,
        companions: body.companions || null,
        styles: body.styles || null,
        hero_image_url: body.hero_image_url || null,
        intro_rich_ko: body.intro_rich_ko || null,
        hashtags: body.hashtags || null,
        status: body.status || 'draft',
        publish: body.publish ?? false,
        publish_at: body.publish_at || null,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ 토픽 페이지 생성 실패:', error)
      return NextResponse.json<TopicPageApiResponse>(
        { success: false, error: '토픽 페이지 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json<TopicPageApiResponse>(
      { success: true, data },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ 토픽 페이지 생성 중 예외 발생:', error)
    return NextResponse.json<TopicPageApiResponse>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/topic-pages
 * 토픽 페이지 수정
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json<TopicPageApiResponse>(
        { success: false, error: 'id가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // slug 변경 시 중복 체크
    if (updates.slug) {
      const { data: existing } = await supabase
        .from('select_topic_pages')
        .select('id')
        .eq('slug', updates.slug)
        .neq('id', id)
        .single()

      if (existing) {
        return NextResponse.json<TopicPageApiResponse>(
          { success: false, error: '이미 존재하는 slug입니다.' },
          { status: 409 }
        )
      }
    }

    const { data, error } = await supabase
      .from('select_topic_pages')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ 토픽 페이지 수정 실패:', error)
      return NextResponse.json<TopicPageApiResponse>(
        { success: false, error: '토픽 페이지 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json<TopicPageApiResponse>({
      success: true,
      data,
    })
  } catch (error) {
    console.error('❌ 토픽 페이지 수정 중 예외 발생:', error)
    return NextResponse.json<TopicPageApiResponse>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/topic-pages?id=xxx
 * 토픽 페이지 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json<TopicPageApiResponse>(
        { success: false, error: 'id가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 연결된 호텔 삭제 (CASCADE로 자동 삭제될 수도 있지만 명시적으로)
    await supabase.from('select_topic_page_hotels').delete().eq('page_id', id)

    const { error } = await supabase
      .from('select_topic_pages')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ 토픽 페이지 삭제 실패:', error)
      return NextResponse.json<TopicPageApiResponse>(
        { success: false, error: '토픽 페이지 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json<TopicPageApiResponse>({
      success: true,
    })
  } catch (error) {
    console.error('❌ 토픽 페이지 삭제 중 예외 발생:', error)
    return NextResponse.json<TopicPageApiResponse>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

