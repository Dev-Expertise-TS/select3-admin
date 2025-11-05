'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
  meta?: Record<string, unknown>
}

// ========================================
// 프로모션 관련 Actions
// ========================================

/**
 * 프로모션 목록 조회
 */
export async function getPromotions(): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const { data: promotions, error } = await supabase
      .from('select_hotel_promotions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('프로모션 조회 오류:', error)
      return { success: false, error: '프로모션 조회 중 오류가 발생했습니다.' }
    }

    return {
      success: true,
      data: {
        promotions: promotions || [],
        totalCount: promotions?.length || 0,
      }
    }
  } catch (err) {
    console.error('프로모션 조회 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 프로모션 매핑된 호텔 조회
 */
export async function getPromotionMappedHotels(): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const { data: hotels, error: hotelsError } = await supabase
      .from('select_hotels')
      .select(`
        sabre_id,
        property_name_ko,
        property_name_en,
        promotions:select_hotel_promotions_map(
          promotion_id,
          start_date,
          end_date,
          select_hotel_promotions(
            id,
            promotion_name,
            promotion_type
          )
        )
      `)
      .not('promotions', 'is', null)

    if (hotelsError) {
      console.error('매핑된 호텔 조회 오류:', hotelsError)
      return { success: false, error: '매핑된 호텔 조회에 실패했습니다.' }
    }

    return {
      success: true,
      data: hotels || []
    }
  } catch (err) {
    console.error('매핑된 호텔 조회 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

// ========================================
// 프로모션 슬롯 관련 Actions
// ========================================

/**
 * 프로모션 슬롯 목록 조회
 */
export async function getPromotionSlots(surface?: string): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    let query = supabase
      .from('select_promotion_slots')
      .select(`
        *,
        hotel:select_hotels(
          sabre_id,
          property_name_ko,
          property_name_en
        )
      `)
      .order('display_order', { ascending: true })

    if (surface) {
      query = query.eq('surface', surface)
    }

    const { data, error } = await query

    if (error) {
      console.error('프로모션 슬롯 조회 오류:', error)
      return { success: false, error: '프로모션 슬롯 조회에 실패했습니다.' }
    }

    return {
      success: true,
      data: data || []
    }
  } catch (err) {
    console.error('프로모션 슬롯 조회 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 프로모션 슬롯 생성
 */
export async function createPromotionSlot(formData: FormData): Promise<ActionResult> {
  try {
    const sabre_id = formData.get('sabre_id') as string
    const surface = formData.get('surface') as string
    const slot_position = formData.get('slot_position') as string

    if (!sabre_id || !surface || !slot_position) {
      return { success: false, error: '필수 필드가 누락되었습니다.' }
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_promotion_slots')
      .insert({
        sabre_id,
        surface,
        slot_position,
        display_order: parseInt(formData.get('display_order') as string) || 0,
        start_date: (formData.get('start_date') as string) || null,
        end_date: (formData.get('end_date') as string) || null,
        is_active: formData.get('is_active') === 'true'
      })
      .select()
      .single()

    if (error) {
      console.error('프로모션 슬롯 생성 오류:', error)
      return { success: false, error: '프로모션 슬롯 생성에 실패했습니다.' }
    }

    revalidatePath('/admin/promotions')
    revalidatePath('/admin/advertisements')
    return { success: true, data }
  } catch (err) {
    console.error('프로모션 슬롯 생성 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 프로모션 슬롯 수정
 */
export async function updatePromotionSlot(id: string, updates: Record<string, unknown>): Promise<ActionResult> {
  try {
    if (!id) {
      return { success: false, error: 'id가 필요합니다.' }
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_promotion_slots')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('프로모션 슬롯 수정 오류:', error)
      return { success: false, error: '프로모션 슬롯 수정에 실패했습니다.' }
    }

    revalidatePath('/admin/promotions')
    revalidatePath('/admin/advertisements')
    return { success: true, data }
  } catch (err) {
    console.error('프로모션 슬롯 수정 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 프로모션 슬롯 삭제
 */
export async function deletePromotionSlot(id: string): Promise<ActionResult> {
  try {
    if (!id) {
      return { success: false, error: 'id가 필요합니다.' }
    }

    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('select_promotion_slots')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('프로모션 슬롯 삭제 오류:', error)
      return { success: false, error: '프로모션 슬롯 삭제에 실패했습니다.' }
    }

    revalidatePath('/admin/promotions')
    revalidatePath('/admin/advertisements')
    return { success: true }
  } catch (err) {
    console.error('프로모션 슬롯 삭제 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

// ========================================
// 광고 노출(Feature Slots) 관련 Actions
// ========================================

/**
 * Feature Slots 조회
 */
export async function getFeatureSlots(surface?: string): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    let query = supabase
      .from('select_feature_slots')
      .select(`
        *,
        hotel:select_hotels(
          sabre_id,
          property_name_ko,
          property_name_en,
          slug
        )
      `)
      .order('created_at', { ascending: false })

    if (surface) {
      query = query.eq('surface', surface)
    }

    const { data, error } = await query

    if (error) {
      console.error('Feature Slots 조회 오류:', error)
      return { success: false, error: 'Feature Slots 조회에 실패했습니다.' }
    }

    return {
      success: true,
      data: data || []
    }
  } catch (err) {
    console.error('Feature Slots 조회 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * Feature Slot 생성
 */
export async function createFeatureSlot(formData: FormData): Promise<ActionResult> {
  try {
    const sabre_id = formData.get('sabre_id') as string
    const surface = formData.get('surface') as string
    const slot_key = formData.get('slot_key') as string

    if (!sabre_id || !surface || !slot_key) {
      return { success: false, error: '필수 필드가 누락되었습니다.' }
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_feature_slots')
      .insert({
        sabre_id,
        surface,
        slot_key,
        start_date: (formData.get('start_date') as string) || null,
        end_date: (formData.get('end_date') as string) || null
      })
      .select()
      .single()

    if (error) {
      console.error('Feature Slot 생성 오류:', error)
      return { success: false, error: 'Feature Slot 생성에 실패했습니다.' }
    }

    revalidatePath('/admin/advertisements')
    return { success: true, data }
  } catch (err) {
    console.error('Feature Slot 생성 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * Feature Slot 삭제
 */
export async function deleteFeatureSlot(id: string): Promise<ActionResult> {
  try {
    if (!id) {
      return { success: false, error: 'id가 필요합니다.' }
    }

    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('select_feature_slots')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Feature Slot 삭제 오류:', error)
      return { success: false, error: 'Feature Slot 삭제에 실패했습니다.' }
    }

    revalidatePath('/admin/advertisements')
    return { success: true }
  } catch (err) {
    console.error('Feature Slot 삭제 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}
