import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TopicPageHotelApiResponse, CreateTopicPageHotelRequest } from '@/types/topic-page'

export const dynamic = 'force-dynamic'

/**
 * GET /api/topic-page-hotels?page_id=xxx
 * 토픽 페이지의 호텔 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const pageId = searchParams.get('page_id')

    if (!pageId) {
      return NextResponse.json<TopicPageHotelApiResponse>(
        { success: false, error: 'page_id가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('select_recommendation_page_hotels')
      .select(`
        *,
        hotel:select_hotels(
          sabre_id,
          property_name_ko,
          property_name_en,
          city_ko,
          country_ko
        )
      `)
      .eq('page_id', pageId)
      .order('pin_to_top', { ascending: false })
      .order('rank_manual', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ 토픽 페이지 호텔 목록 조회 실패:', error)
      return NextResponse.json<TopicPageHotelApiResponse>(
        { success: false, error: '호텔 목록을 조회하는데 실패했습니다.' },
        { status: 500 }
      )
    }

    // hotel 정규화 (Supabase 조인 결과는 배열로 반환됨)
    const normalizedData = data?.map((item) => ({
      ...item,
      hotel: Array.isArray(item.hotel) && item.hotel.length > 0 ? item.hotel[0] : null,
    }))

    return NextResponse.json<TopicPageHotelApiResponse>({
      success: true,
      data: normalizedData || [],
      meta: {
        count: normalizedData?.length || 0,
      },
    })
  } catch (error) {
    console.error('❌ 토픽 페이지 호텔 목록 조회 중 예외 발생:', error)
    return NextResponse.json<TopicPageHotelApiResponse>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/topic-page-hotels
 * 토픽 페이지에 호텔 추가
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateTopicPageHotelRequest = await request.json()

    // 필수 필드 검증
    if (!body.page_id || !body.sabre_id) {
      return NextResponse.json<TopicPageHotelApiResponse>(
        { success: false, error: 'page_id와 sabre_id는 필수입니다.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 중복 체크
    const { data: existing } = await supabase
      .from('select_recommendation_page_hotels')
      .select('id')
      .eq('page_id', body.page_id)
      .eq('sabre_id', body.sabre_id)
      .single()

    if (existing) {
      return NextResponse.json<TopicPageHotelApiResponse>(
        { success: false, error: '이미 추가된 호텔입니다.' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('select_recommendation_page_hotels')
      .insert({
        page_id: body.page_id,
        sabre_id: body.sabre_id,
        pin_to_top: body.pin_to_top || false,
        rank_manual: body.rank_manual || null,
        badge_text_ko: body.badge_text_ko || null,
        card_title_ko: body.card_title_ko || null,
        card_blurb_ko: body.card_blurb_ko || null,
        card_image_url: body.card_image_url || null,
        gallery_image_urls: body.gallery_image_urls || null,
        match_where_note_ko: body.match_where_note_ko || null,
        match_companion_note_ko: body.match_companion_note_ko || null,
        match_style_note_ko: body.match_style_note_ko || null,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ 토픽 페이지 호텔 추가 실패:', error)
      return NextResponse.json<TopicPageHotelApiResponse>(
        { success: false, error: '호텔 추가에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json<TopicPageHotelApiResponse>(
      { success: true, data },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ 토픽 페이지 호텔 추가 중 예외 발생:', error)
    return NextResponse.json<TopicPageHotelApiResponse>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/topic-page-hotels
 * 토픽 페이지 호텔 정보 수정
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json<TopicPageHotelApiResponse>(
        { success: false, error: 'id가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('select_recommendation_page_hotels')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ 토픽 페이지 호텔 수정 실패:', error)
      return NextResponse.json<TopicPageHotelApiResponse>(
        { success: false, error: '호텔 정보 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json<TopicPageHotelApiResponse>({
      success: true,
      data,
    })
  } catch (error) {
    console.error('❌ 토픽 페이지 호텔 수정 중 예외 발생:', error)
    return NextResponse.json<TopicPageHotelApiResponse>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/topic-page-hotels?id=xxx
 * 토픽 페이지에서 호텔 제거
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json<TopicPageHotelApiResponse>(
        { success: false, error: 'id가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('select_recommendation_page_hotels')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ 토픽 페이지 호텔 삭제 실패:', error)
      return NextResponse.json<TopicPageHotelApiResponse>(
        { success: false, error: '호텔 제거에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json<TopicPageHotelApiResponse>({
      success: true,
    })
  } catch (error) {
    console.error('❌ 토픽 페이지 호텔 삭제 중 예외 발생:', error)
    return NextResponse.json<TopicPageHotelApiResponse>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

