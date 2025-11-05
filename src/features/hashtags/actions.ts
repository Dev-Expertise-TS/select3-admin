'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TagCategory, Tag, HotelTagMap } from '@/types/hashtag'

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

// ========================================
// 카테고리 관련 Actions
// ========================================

/**
 * 카테고리 목록 조회
 */
export async function getCategories(): Promise<ActionResult<TagCategory[]>> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_tag_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name_ko', { ascending: true })

    if (error) {
      console.error('카테고리 조회 오류:', error)
      return { success: false, error: '카테고리를 조회할 수 없습니다.' }
    }

    return { success: true, data: data as TagCategory[] }
  } catch (err) {
    console.error('카테고리 조회 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 카테고리 생성
 */
export async function createCategory(formData: FormData): Promise<ActionResult<TagCategory>> {
  try {
    const slug = formData.get('slug') as string
    const name_ko = formData.get('name_ko') as string
    const name_en = formData.get('name_en') as string
    const sort_order = parseInt(formData.get('sort_order') as string) || 0
    const is_facetable = formData.get('is_facetable') === 'true'
    const multi_select = formData.get('multi_select') === 'true'
    const icon = formData.get('icon') as string

    if (!slug || !name_ko) {
      return { success: false, error: 'slug와 name_ko는 필수입니다.' }
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_tag_categories')
      .insert({
        slug,
        name_ko,
        name_en: name_en || null,
        sort_order,
        is_facetable,
        multi_select,
        icon: icon || null
      })
      .select()
      .single()

    if (error) {
      console.error('카테고리 생성 오류:', error)
      return { success: false, error: '카테고리를 생성할 수 없습니다.' }
    }

    revalidatePath('/admin/hashtags')
    return { success: true, data: data as TagCategory }
  } catch (err) {
    console.error('카테고리 생성 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 카테고리 수정
 */
export async function updateCategory(id: string, formData: FormData): Promise<ActionResult<TagCategory>> {
  try {
    const slug = formData.get('slug') as string
    const name_ko = formData.get('name_ko') as string
    const name_en = formData.get('name_en') as string
    const sort_order = parseInt(formData.get('sort_order') as string) || 0
    const is_facetable = formData.get('is_facetable') === 'true'
    const multi_select = formData.get('multi_select') === 'true'
    const icon = formData.get('icon') as string

    const supabase = createServiceRoleClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (slug !== undefined) updateData.slug = slug
    if (name_ko !== undefined) updateData.name_ko = name_ko
    if (name_en !== undefined) updateData.name_en = name_en || null
    updateData.sort_order = sort_order
    updateData.is_facetable = is_facetable
    updateData.multi_select = multi_select
    if (icon !== undefined) updateData.icon = icon || null

    const { data, error } = await supabase
      .from('select_tag_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('카테고리 수정 오류:', error)
      return { success: false, error: '카테고리를 수정할 수 없습니다.' }
    }

    revalidatePath('/admin/hashtags')
    return { success: true, data: data as TagCategory }
  } catch (err) {
    console.error('카테고리 수정 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 카테고리 삭제
 */
export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('select_tag_categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('카테고리 삭제 오류:', error)
      return { success: false, error: '카테고리를 삭제할 수 없습니다.' }
    }

    revalidatePath('/admin/hashtags')
    return { success: true }
  } catch (err) {
    console.error('카테고리 삭제 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

// ========================================
// 태그 관련 Actions
// ========================================

/**
 * 태그 목록 조회
 */
export async function getTags(categoryId?: string, search?: string): Promise<ActionResult<Tag[]>> {
  try {
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

    if (search && search.trim()) {
      query = query.or(`name_ko.ilike.%${search}%,name_en.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('태그 조회 오류:', error)
      return { success: false, error: '태그를 조회할 수 없습니다.' }
    }

    return { success: true, data: data as Tag[] }
  } catch (err) {
    console.error('태그 조회 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 태그 생성
 */
export async function createTag(formData: FormData): Promise<ActionResult<Tag>> {
  try {
    const slug = formData.get('slug') as string
    const name_ko = formData.get('name_ko') as string
    const name_en = formData.get('name_en') as string
    const category_id = formData.get('category_id') as string
    const synonyms_ko = formData.get('synonyms_ko') as string
    const synonyms_en = formData.get('synonyms_en') as string
    const description_ko = formData.get('description_ko') as string
    const description_en = formData.get('description_en') as string
    const weight = parseInt(formData.get('weight') as string) || 0
    const is_active = formData.get('is_active') === 'true'
    const icon = formData.get('icon') as string

    if (!slug || !name_ko) {
      return { success: false, error: 'slug와 name_ko는 필수입니다.' }
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_tags')
      .insert({
        slug,
        name_ko,
        name_en: name_en || null,
        category_id: category_id || null,
        synonyms_ko: synonyms_ko || '{}',
        synonyms_en: synonyms_en || '{}',
        description_ko: description_ko || null,
        description_en: description_en || null,
        weight,
        is_active,
        icon: icon || null,
        meta: null
      })
      .select()
      .single()

    if (error) {
      console.error('태그 생성 오류:', error)
      return { success: false, error: '태그를 생성할 수 없습니다.' }
    }

    revalidatePath('/admin/hashtags')
    return { success: true, data: data as Tag }
  } catch (err) {
    console.error('태그 생성 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 태그 수정
 */
export async function updateTag(id: string, formData: FormData): Promise<ActionResult<Tag>> {
  try {
    const slug = formData.get('slug') as string
    const name_ko = formData.get('name_ko') as string
    const name_en = formData.get('name_en') as string
    const category_id = formData.get('category_id') as string
    const synonyms_ko = formData.get('synonyms_ko') as string
    const synonyms_en = formData.get('synonyms_en') as string
    const description_ko = formData.get('description_ko') as string
    const description_en = formData.get('description_en') as string
    const weight = parseInt(formData.get('weight') as string) || 0
    const is_active = formData.get('is_active') === 'true'
    const icon = formData.get('icon') as string

    const supabase = createServiceRoleClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (slug !== undefined) updateData.slug = slug
    if (name_ko !== undefined) updateData.name_ko = name_ko
    if (name_en !== undefined) updateData.name_en = name_en || null
    if (category_id !== undefined) updateData.category_id = category_id || null
    if (synonyms_ko !== undefined) updateData.synonyms_ko = synonyms_ko || '{}'
    if (synonyms_en !== undefined) updateData.synonyms_en = synonyms_en || '{}'
    if (description_ko !== undefined) updateData.description_ko = description_ko || null
    if (description_en !== undefined) updateData.description_en = description_en || null
    updateData.weight = weight
    updateData.is_active = is_active
    if (icon !== undefined) updateData.icon = icon || null

    const { data, error } = await supabase
      .from('select_tags')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('태그 수정 오류:', error)
      return { success: false, error: '태그를 수정할 수 없습니다.' }
    }

    revalidatePath('/admin/hashtags')
    return { success: true, data: data as Tag }
  } catch (err) {
    console.error('태그 수정 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 태그 삭제
 */
export async function deleteTag(id: string): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('select_tags')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('태그 삭제 오류:', error)
      return { success: false, error: '태그를 삭제할 수 없습니다.' }
    }

    revalidatePath('/admin/hashtags')
    return { success: true }
  } catch (err) {
    console.error('태그 삭제 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

// ========================================
// 호텔-태그 매핑 관련 Actions
// ========================================

/**
 * 호텔-태그 매핑 조회 (호텔 정보 포함)
 */
export async function getHotelTags(sabreId?: string, tagId?: string): Promise<ActionResult<HotelTagMap[]>> {
  try {
    const supabase = createServiceRoleClient()

    let query = supabase
      .from('select_hotel_tags_map')
      .select(`
        *,
        tag:select_tags(
          *,
          category:select_tag_categories(*)
        ),
        hotel:select_hotels!select_hotel_tags_map_sabre_id_fkey(
          sabre_id,
          property_name_ko,
          property_name_en
        )
      `)

    if (sabreId) {
      query = query.eq('sabre_id', sabreId)
    }

    if (tagId) {
      query = query.eq('tag_id', tagId)
    }

    const { data, error } = await query

    if (error) {
      console.error('호텔-태그 매핑 조회 오류:', error)
      return { success: false, error: '호텔-태그 매핑을 조회할 수 없습니다.' }
    }

    return { success: true, data: data as HotelTagMap[] }
  } catch (err) {
    console.error('호텔-태그 매핑 조회 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 호텔-태그 매핑 생성
 */
export async function createHotelTag(sabreId: string, tagId: string): Promise<ActionResult<HotelTagMap>> {
  try {
    if (!sabreId || !tagId) {
      return { success: false, error: 'sabre_id와 tag_id는 필수입니다.' }
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_hotel_tags_map')
      .insert({
        sabre_id: sabreId,
        tag_id: tagId
      })
      .select()
      .single()

    if (error) {
      console.error('호텔-태그 매핑 생성 오류:', error)
      return { success: false, error: '호텔-태그 매핑을 생성할 수 없습니다.' }
    }

    revalidatePath('/admin/hashtags')
    return { success: true, data: data as HotelTagMap }
  } catch (err) {
    console.error('호텔-태그 매핑 생성 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 호텔-태그 매핑 삭제
 */
export async function deleteHotelTag(sabreId: string, tagId: string): Promise<ActionResult> {
  try {
    if (!sabreId || !tagId) {
      return { success: false, error: 'sabre_id와 tag_id는 필수입니다.' }
    }

    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('select_hotel_tags_map')
      .delete()
      .eq('sabre_id', sabreId)
      .eq('tag_id', tagId)

    if (error) {
      console.error('호텔-태그 매핑 삭제 오류:', error)
      return { success: false, error: '호텔-태그 매핑을 삭제할 수 없습니다.' }
    }

    revalidatePath('/admin/hashtags')
    return { success: true }
  } catch (err) {
    console.error('호텔-태그 매핑 삭제 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 특정 호텔의 모든 태그 매핑 삭제
 */
export async function deleteAllHotelTags(sabreId: string): Promise<ActionResult> {
  try {
    if (!sabreId) {
      return { success: false, error: 'sabre_id는 필수입니다.' }
    }

    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('select_hotel_tags_map')
      .delete()
      .eq('sabre_id', sabreId)

    if (error) {
      console.error('호텔-태그 매핑 전체 삭제 오류:', error)
      return { success: false, error: '호텔 태그를 삭제할 수 없습니다.' }
    }

    revalidatePath('/admin/hashtags')
    return { success: true }
  } catch (err) {
    console.error('호텔-태그 매핑 전체 삭제 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

