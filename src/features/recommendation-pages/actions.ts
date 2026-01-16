'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { 
  TopicPage, 
  TopicPageHotel, 
  CreateTopicPageRequest, 
  UpdateTopicPageRequest,
  CreateTopicPageHotelRequest,
  UpdateTopicPageHotelRequest
} from '@/types/topic-page'

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
  meta?: Record<string, unknown>
}

// ========================================
// 추천 페이지 관련 Actions
// ========================================

/**
 * 추천 페이지 목록 조회
 */
export async function getTopicPagesList(
  status?: string,
  search?: string,
  publishedOnly?: boolean
): Promise<ActionResult<TopicPage[]>> {
  try {
    const supabase = await createClient()

    console.log('🔍 [Server Action] getTopicPagesList 시작', { status, search, publishedOnly })

    // 외래키 없이 페이지 목록만 먼저 조회
    let query = supabase
      .from('select_recommendation_pages')
      .select('*')
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
      console.error('❌ [Server Action] 추천 페이지 목록 조회 실패:', error)
      return { success: false, error: `추천 페이지 목록을 조회하는데 실패했습니다: ${error.message}` }
    }

    console.log('✅ [Server Action] 조회된 데이터:', data?.length, '개')

    // 각 페이지의 호텔 개수를 별도로 조회
    const pagesWithCount = await Promise.all(
      (data || []).map(async (page) => {
        const { count } = await supabase
          .from('select_recommendation_page_hotels')
          .select('*', { count: 'exact', head: true })
          .eq('page_id', page.id)
        
        return {
          ...page,
          hotel_count: count || 0,
        }
      })
    )

    return {
      success: true,
      data: pagesWithCount as TopicPage[],
      meta: { count: pagesWithCount?.length || 0 }
    }
  } catch (err) {
    console.error('❌ [Server Action] 추천 페이지 목록 조회 중 오류:', err)
    const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류'
    return { success: false, error: `서버 오류가 발생했습니다: ${errorMessage}` }
  }
}

/**
 * 추천 페이지 단일 조회
 */
export async function getTopicPage(id?: string, slug?: string): Promise<ActionResult<TopicPage>> {
  try {
    if (!id && !slug) {
      return { success: false, error: 'id 또는 slug가 필요합니다.' }
    }

    const supabase = await createClient()

    // 외래키 없이 페이지 먼저 조회
    let query = supabase
      .from('select_recommendation_pages')
      .select('*')

    if (id) {
      query = query.eq('id', id)
    } else if (slug) {
      query = query.eq('slug', slug)
    }

    const { data: pageData, error: pageError } = await query.single()

    if (pageError) {
      console.error('❌ 추천 페이지 조회 실패:', pageError)
      return { success: false, error: '추천 페이지를 찾을 수 없습니다.' }
    }

    // 연결된 호텔 정보 별도 조회
    const { data: hotelsData, error: hotelsError } = await supabase
      .from('select_recommendation_page_hotels')
      .select('*')
      .eq('page_id', pageData.id)
      .order('pin_to_top', { ascending: false })
      .order('rank_manual', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (hotelsError) {
      console.warn('⚠️ 호텔 정보 조회 실패:', hotelsError)
    }

    // 각 호텔의 상세 정보 조회
    const hotelsWithInfo = await Promise.all(
      (hotelsData || []).map(async (hotelMapping: any) => {
        const { data: hotelInfo } = await supabase
          .from('select_hotels')
          .select('sabre_id, property_name_ko, property_name_en, city_ko, country_ko')
          .eq('sabre_id', hotelMapping.sabre_id)
          .single()

        return {
          ...hotelMapping,
          hotel: hotelInfo || null,
        }
      })
    )

    const normalizedData = {
      ...pageData,
      hotels: hotelsWithInfo,
    }

    return { success: true, data: normalizedData as TopicPage }
  } catch (err) {
    console.error('❌ 추천 페이지 조회 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 추천 페이지 생성
 */
export async function createTopicPage(data: CreateTopicPageRequest): Promise<ActionResult<TopicPage>> {
  try {
    const { slug, title_ko, ...rest } = data

    if (!slug || !title_ko) {
      return { success: false, error: 'slug와 title_ko는 필수입니다.' }
    }

    const supabase = await createClient()

    // slug 중복 체크
    const { data: existing } = await supabase
      .from('select_recommendation_pages')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return { success: false, error: '이미 존재하는 slug입니다.' }
    }

    const { data: insertedData, error } = await supabase
      .from('select_recommendation_pages')
      .insert({
        slug,
        title_ko,
        ...rest,
        status: rest.status || 'draft',
        publish: rest.publish ?? false,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ 추천 페이지 생성 실패:', error)
      return { success: false, error: '추천 페이지 생성에 실패했습니다.' }
    }

    revalidatePath('/admin/recommendation-pages')
    return { success: true, data: insertedData as TopicPage }
  } catch (err) {
    console.error('❌ 추천 페이지 생성 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 추천 페이지 수정
 */
export async function updateTopicPage(data: UpdateTopicPageRequest): Promise<ActionResult<TopicPage>> {
  try {
    const { id, ...updates } = data

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
        .maybeSingle()

      if (existing) {
        return { success: false, error: '이미 존재하는 slug입니다.' }
      }
    }

    const { data: updatedData, error } = await supabase
      .from('select_recommendation_pages')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ 추천 페이지 수정 실패:', error)
      return { success: false, error: '추천 페이지 수정에 실패했습니다.' }
    }

    revalidatePath('/admin/recommendation-pages')
    revalidatePath(`/admin/recommendation-pages/${id}`)
    return { success: true, data: updatedData as TopicPage }
  } catch (err) {
    console.error('❌ 추천 페이지 수정 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 추천 페이지 삭제
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
      console.error('❌ 추천 페이지 삭제 실패:', error)
      return { success: false, error: '추천 페이지 삭제에 실패했습니다.' }
    }

    revalidatePath('/admin/recommendation-pages')
    return { success: true }
  } catch (err) {
    console.error('❌ 추천 페이지 삭제 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

// ========================================
// 추천 페이지 호텔 관련 Actions
// ========================================

/**
 * 추천 페이지의 호텔 목록 조회
 */
export async function getTopicPageHotels(pageId: string): Promise<ActionResult<TopicPageHotel[]>> {
  try {
    if (!pageId) {
      return { success: false, error: 'page_id가 필요합니다.' }
    }

    const supabase = await createClient()

    // 외래키 없이 호텔 매핑 조회
    const { data: mappings, error } = await supabase
      .from('select_recommendation_page_hotels')
      .select('*')
      .eq('page_id', pageId)
      .order('pin_to_top', { ascending: false })
      .order('rank_manual', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ 추천 페이지 호텔 목록 조회 실패:', error)
      return { success: false, error: '호텔 목록을 조회하는데 실패했습니다.' }
    }

    // 각 호텔의 상세 정보 조회
    const hotelsWithInfo = await Promise.all(
      (mappings || []).map(async (mapping: any) => {
        const { data: hotelInfo } = await supabase
          .from('select_hotels')
          .select('sabre_id, property_name_ko, property_name_en, city_ko, country_ko')
          .eq('sabre_id', mapping.sabre_id)
          .single()

        return {
          ...mapping,
          hotel: hotelInfo || null,
        }
      })
    )

    return {
      success: true,
      data: hotelsWithInfo as TopicPageHotel[],
      meta: { count: hotelsWithInfo?.length || 0 }
    }
  } catch (err) {
    console.error('❌ 추천 페이지 호텔 목록 조회 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 추천 페이지에 호텔 추가
 */
export async function addHotelToTopicPage(data: CreateTopicPageHotelRequest): Promise<ActionResult<TopicPageHotel>> {
  try {
    const { page_id, sabre_id, ...rest } = data

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
      .maybeSingle()

    if (existing) {
      return { success: false, error: '이미 추가된 호텔입니다.' }
    }

    const { data: insertedData, error } = await supabase
      .from('select_recommendation_page_hotels')
      .insert({
        page_id,
        sabre_id,
        ...rest,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ 추천 페이지 호텔 추가 실패:', error)
      return { success: false, error: '호텔 추가에 실패했습니다.' }
    }

    revalidatePath(`/admin/recommendation-pages/${page_id}`)
    return { success: true, data: insertedData as TopicPageHotel }
  } catch (err) {
    console.error('❌ 추천 페이지 호텔 추가 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 추천 페이지 호텔 정보 수정
 */
export async function updateTopicPageHotel(data: UpdateTopicPageHotelRequest): Promise<ActionResult<TopicPageHotel>> {
  try {
    const { id, ...updates } = data
    if (!id) {
      return { success: false, error: 'id가 필요합니다.' }
    }

    const supabase = await createClient()

    const { data: updatedData, error } = await supabase
      .from('select_recommendation_page_hotels')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ 추천 페이지 호텔 수정 실패:', error)
      return { success: false, error: '호텔 정보 수정에 실패했습니다.' }
    }

    // page_id를 가져와서 revalidate하기 위해
    const pageId = updatedData.page_id
    revalidatePath(`/admin/recommendation-pages/${pageId}`)
    
    return { success: true, data: updatedData as TopicPageHotel }
  } catch (err) {
    console.error('❌ 추천 페이지 호텔 수정 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 추천 페이지에서 호텔 제거
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
      console.error('❌ 추천 페이지 호텔 삭제 실패:', error)
      return { success: false, error: '호텔 제거에 실패했습니다.' }
    }

    revalidatePath('/admin/recommendation-pages')
    return { success: true }
  } catch (err) {
    console.error('❌ 추천 페이지 호텔 삭제 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

