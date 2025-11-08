'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TopicPage, TopicPageHotel } from '@/types/topic-page'

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
  meta?: Record<string, unknown>
}

// ========================================
// 토픽 페이지 관련 Actions
// ========================================

/**
 * 토픽 페이지 목록 조회
 */
export async function getTopicPagesList(
  status?: string,
  search?: string,
  publishedOnly?: boolean
): Promise<ActionResult<TopicPage[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('select_recommendation_pages')
      .select(`
        *,
        hotel_count:select_recommendation_page_hotels(count)
      `)
      .order('created_at', { ascending: false })

    // 배포 여부 필터
    if (publishedOnly) {
      query = query.eq('publish', true)
    }

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
      console.error('토픽 페이지 목록 조회 실패:', error)
      return { success: false, error: '토픽 페이지 목록을 조회하는데 실패했습니다.' }
    }

    // hotel_count 정규화
    const normalizedData = data?.map((page) => ({
      ...page,
      hotel_count: page.hotel_count?.[0]?.count || 0,
    }))

    return {
      success: true,
      data: normalizedData as TopicPage[],
      meta: { count: normalizedData?.length || 0 }
    }
  } catch (err) {
    console.error('토픽 페이지 목록 조회 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 토픽 페이지 단일 조회
 */
export async function getTopicPage(id?: string, slug?: string): Promise<ActionResult<TopicPage>> {
  try {
    if (!id && !slug) {
      return { success: false, error: 'id 또는 slug가 필요합니다.' }
    }

    const supabase = await createClient()

    let query = supabase
      .from('select_recommendation_pages')
      .select(`
        *,
        hotels:select_recommendation_page_hotels(
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
      console.error('토픽 페이지 조회 실패:', error)
      return { success: false, error: '토픽 페이지를 찾을 수 없습니다.' }
    }

    // hotels 정규화
    const normalizedData = {
      ...data,
      hotels: data.hotels?.map((item: any) => ({
        ...item,
        hotel: Array.isArray(item.hotel) && item.hotel.length > 0 ? item.hotel[0] : null,
      })),
    }

    return { success: true, data: normalizedData as TopicPage }
  } catch (err) {
    console.error('토픽 페이지 조회 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 토픽 페이지 생성
 */
export async function createTopicPage(formData: FormData): Promise<ActionResult<TopicPage>> {
  try {
    const slug = formData.get('slug') as string
    const title_ko = formData.get('title_ko') as string

    if (!slug || !title_ko) {
      return { success: false, error: 'slug와 title_ko는 필수입니다.' }
    }

    const supabase = await createClient()

    // slug 중복 체크
    const { data: existing } = await supabase
      .from('select_recommendation_pages')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return { success: false, error: '이미 존재하는 slug입니다.' }
    }

    // 배열 필드 파싱
    const parseArray = (value: string | null) => {
      if (!value || !value.trim()) return null
      return value.split(',').map(s => s.trim()).filter(Boolean)
    }

    const { data, error } = await supabase
      .from('select_recommendation_pages')
      .insert({
        slug,
        title_ko,
        where_countries: parseArray(formData.get('where_countries') as string),
        where_cities: parseArray(formData.get('where_cities') as string),
        companions: parseArray(formData.get('companions') as string),
        styles: parseArray(formData.get('styles') as string),
        hero_image_url: (formData.get('hero_image_url') as string) || null,
        intro_rich_ko: (formData.get('intro_rich_ko') as string) || null,
        hashtags: parseArray(formData.get('hashtags') as string),
        status: (formData.get('status') as string) || 'draft',
        publish: formData.get('publish') === 'true',
        publish_at: (formData.get('publish_at') as string) || null,
      })
      .select()
      .single()

    if (error) {
      console.error('토픽 페이지 생성 실패:', error)
      return { success: false, error: '토픽 페이지 생성에 실패했습니다.' }
    }

    revalidatePath('/admin/recommendation-pages')
    return { success: true, data: data as TopicPage }
  } catch (err) {
    console.error('토픽 페이지 생성 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 토픽 페이지 수정
 */
export async function updateTopicPage(id: string, updates: Record<string, unknown>): Promise<ActionResult<TopicPage>> {
  try {
    if (!id) {
      return { success: false, error: 'id가 필요합니다.' }
    }

    const supabase = await createClient()

    // slug 변경 시 중복 체크
    if (updates.slug) {
      const { data: existing } = await supabase
        .from('select_recommendation_pages')
        .select('id')
        .eq('slug', updates.slug)
        .neq('id', id)
        .single()

      if (existing) {
        return { success: false, error: '이미 존재하는 slug입니다.' }
      }
    }

    const { data, error } = await supabase
      .from('select_recommendation_pages')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('토픽 페이지 수정 실패:', error)
      return { success: false, error: '토픽 페이지 수정에 실패했습니다.' }
    }

    revalidatePath('/admin/recommendation-pages')
    return { success: true, data: data as TopicPage }
  } catch (err) {
    console.error('토픽 페이지 수정 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 토픽 페이지 삭제
 */
export async function deleteTopicPage(id: string): Promise<ActionResult> {
  try {
    if (!id) {
      return { success: false, error: 'id가 필요합니다.' }
    }

    const supabase = await createClient()

    // 연결된 호텔 삭제
    await supabase.from('select_recommendation_page_hotels').delete().eq('page_id', id)

    const { error } = await supabase
      .from('select_recommendation_pages')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('토픽 페이지 삭제 실패:', error)
      return { success: false, error: '토픽 페이지 삭제에 실패했습니다.' }
    }

    revalidatePath('/admin/recommendation-pages')
    return { success: true }
  } catch (err) {
    console.error('토픽 페이지 삭제 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

// ========================================
// 토픽 페이지 호텔 관련 Actions
// ========================================

/**
 * 토픽 페이지의 호텔 목록 조회
 */
export async function getTopicPageHotels(pageId: string): Promise<ActionResult<TopicPageHotel[]>> {
  try {
    if (!pageId) {
      return { success: false, error: 'page_id가 필요합니다.' }
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
      console.error('토픽 페이지 호텔 목록 조회 실패:', error)
      return { success: false, error: '호텔 목록을 조회하는데 실패했습니다.' }
    }

    // hotel 정규화
    const normalizedData = data?.map((item: any) => ({
      ...item,
      hotel: Array.isArray(item.hotel) && item.hotel.length > 0 ? item.hotel[0] : null,
    }))

    return {
      success: true,
      data: normalizedData as TopicPageHotel[],
      meta: { count: normalizedData?.length || 0 }
    }
  } catch (err) {
    console.error('토픽 페이지 호텔 목록 조회 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 토픽 페이지에 호텔 추가
 */
export async function addHotelToTopicPage(formData: FormData): Promise<ActionResult<TopicPageHotel>> {
  try {
    const page_id = formData.get('page_id') as string
    const sabre_id = formData.get('sabre_id') as string

    if (!page_id || !sabre_id) {
      return { success: false, error: 'page_id와 sabre_id는 필수입니다.' }
    }

    const supabase = await createClient()

    // 중복 체크
    const { data: existing } = await supabase
      .from('select_recommendation_page_hotels')
      .select('id')
      .eq('page_id', page_id)
      .eq('sabre_id', sabre_id)
      .single()

    if (existing) {
      return { success: false, error: '이미 추가된 호텔입니다.' }
    }

    // 배열 필드 파싱
    const parseArray = (value: string | null) => {
      if (!value || !value.trim()) return null
      return value.split(',').map(s => s.trim()).filter(Boolean)
    }

    const { data, error } = await supabase
      .from('select_recommendation_page_hotels')
      .insert({
        page_id,
        sabre_id,
        pin_to_top: formData.get('pin_to_top') === 'true',
        rank_manual: parseInt(formData.get('rank_manual') as string) || null,
        badge_text_ko: (formData.get('badge_text_ko') as string) || null,
        card_title_ko: (formData.get('card_title_ko') as string) || null,
        card_blurb_ko: (formData.get('card_blurb_ko') as string) || null,
        card_image_url: (formData.get('card_image_url') as string) || null,
        gallery_image_urls: parseArray(formData.get('gallery_image_urls') as string),
        match_where_note_ko: (formData.get('match_where_note_ko') as string) || null,
        match_companion_note_ko: (formData.get('match_companion_note_ko') as string) || null,
        match_style_note_ko: (formData.get('match_style_note_ko') as string) || null,
      })
      .select()
      .single()

    if (error) {
      console.error('토픽 페이지 호텔 추가 실패:', error)
      return { success: false, error: '호텔 추가에 실패했습니다.' }
    }

    revalidatePath('/admin/recommendation-pages')
    return { success: true, data: data as TopicPageHotel }
  } catch (err) {
    console.error('토픽 페이지 호텔 추가 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 토픽 페이지 호텔 정보 수정
 */
export async function updateTopicPageHotel(id: string, updates: Record<string, unknown>): Promise<ActionResult<TopicPageHotel>> {
  try {
    if (!id) {
      return { success: false, error: 'id가 필요합니다.' }
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
      console.error('토픽 페이지 호텔 수정 실패:', error)
      return { success: false, error: '호텔 정보 수정에 실패했습니다.' }
    }

    revalidatePath('/admin/recommendation-pages')
    return { success: true, data: data as TopicPageHotel }
  } catch (err) {
    console.error('토픽 페이지 호텔 수정 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 토픽 페이지에서 호텔 제거
 */
export async function removeHotelFromTopicPage(id: string): Promise<ActionResult> {
  try {
    if (!id) {
      return { success: false, error: 'id가 필요합니다.' }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('select_recommendation_page_hotels')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('토픽 페이지 호텔 삭제 실패:', error)
      return { success: false, error: '호텔 제거에 실패했습니다.' }
    }

    revalidatePath('/admin/recommendation-pages')
    return { success: true }
  } catch (err) {
    console.error('토픽 페이지 호텔 삭제 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

