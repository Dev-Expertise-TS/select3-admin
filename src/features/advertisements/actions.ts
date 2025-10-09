'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Feature Slot 저장 (Hero Carousel)
 */
export async function saveFeatureSlot(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const id = formData.get('id') as string
    const sabreId = formData.get('sabre_id') as string
    const surface = formData.get('surface') as string
    const slotKey = formData.get('slot_key') as string
    const startDate = formData.get('start_date') as string
    const endDate = formData.get('end_date') as string

    if (!sabreId || !slotKey) {
      return {
        success: false,
        error: 'Sabre ID와 Slot Key는 필수입니다.',
      }
    }

    const slotData = {
      sabre_id: sabreId,
      surface: surface || null,
      slot_key: slotKey,
      start_date: startDate || null,
      end_date: endDate || null,
    }

    let result

    if (id && id !== '' && id !== '-1') {
      // 업데이트
      const { data, error } = await supabase
        .from('select_feature_slots')
        .update(slotData)
        .eq('id', Number(id))
        .select()
        .single()

      if (error) {
        console.error('Feature Slot 업데이트 오류:', error)
        return {
          success: false,
          error: `업데이트에 실패했습니다: ${error.message}`,
        }
      }

      result = data
    } else {
      // 생성
      const { data, error } = await supabase
        .from('select_feature_slots')
        .insert(slotData)
        .select()
        .single()

      if (error) {
        console.error('Feature Slot 생성 오류:', error)
        return {
          success: false,
          error: `생성에 실패했습니다: ${error.message}`,
        }
      }

      result = data
    }

    revalidatePath('/admin/advertisements')

    return {
      success: true,
      data: { slot: result },
    }
  } catch (error) {
    console.error('Feature Slot 저장 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

/**
 * Feature Slot 삭제
 */
export async function deleteFeatureSlot(id: number): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('select_feature_slots')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Feature Slot 삭제 오류:', error)
      return {
        success: false,
        error: `삭제에 실패했습니다: ${error.message}`,
      }
    }

    revalidatePath('/admin/advertisements')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Feature Slot 삭제 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

/**
 * Promotion Slot 저장
 */
export async function savePromotionSlot(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const id = formData.get('id') as string
    const sabreId = formData.get('sabre_id') as string
    const surface = formData.get('surface') as string
    const slotKey = formData.get('slot_key') as string
    const startDate = formData.get('start_date') as string
    const endDate = formData.get('end_date') as string

    if (!sabreId || !slotKey || !surface) {
      return {
        success: false,
        error: 'Sabre ID, Surface, Slot Key는 필수입니다.',
      }
    }

    const slotData = {
      sabre_id: sabreId,
      surface,
      slot_key: slotKey,
      start_date: startDate || null,
      end_date: endDate || null,
    }

    let result

    if (id && id !== '' && id !== '-1') {
      // 업데이트
      const { data, error } = await supabase
        .from('select_promotion_slots')
        .update(slotData)
        .eq('id', Number(id))
        .select()
        .single()

      if (error) {
        console.error('Promotion Slot 업데이트 오류:', error)
        return {
          success: false,
          error: `업데이트에 실패했습니다: ${error.message}`,
        }
      }

      result = data
    } else {
      // 생성
      const { data, error } = await supabase
        .from('select_promotion_slots')
        .insert(slotData)
        .select()
        .single()

      if (error) {
        console.error('Promotion Slot 생성 오류:', error)
        return {
          success: false,
          error: `생성에 실패했습니다: ${error.message}`,
        }
      }

      result = data
    }

    revalidatePath('/admin/advertisements')

    return {
      success: true,
      data: { slot: result },
    }
  } catch (error) {
    console.error('Promotion Slot 저장 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

/**
 * Promotion Slot 삭제
 */
export async function deletePromotionSlot(id: number): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('select_promotion_slots')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Promotion Slot 삭제 오류:', error)
      return {
        success: false,
        error: `삭제에 실패했습니다: ${error.message}`,
      }
    }

    revalidatePath('/admin/advertisements')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Promotion Slot 삭제 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

/**
 * Promo Banner 생성
 */
export async function createPromoBanner(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const title = formData.get('title') as string
    const content = formData.get('content') as string
    const imageUrl = formData.get('image_url') as string
    const linkUrl = formData.get('link_url') as string
    const isActive = formData.get('is_active') === 'true'
    const startDate = formData.get('start_date') as string
    const endDate = formData.get('end_date') as string

    if (!title || !content) {
      return {
        success: false,
        error: '제목과 내용은 필수입니다.',
      }
    }

    const { data, error } = await supabase
      .from('select_promo_banners')
      .insert({
        title,
        content,
        image_url: imageUrl || null,
        link_url: linkUrl || null,
        is_active: isActive,
        start_date: startDate || null,
        end_date: endDate || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Promo Banner 생성 오류:', error)
      return {
        success: false,
        error: `생성에 실패했습니다: ${error.message}`,
      }
    }

    revalidatePath('/admin/advertisements')

    return {
      success: true,
      data: { banner: data },
    }
  } catch (error) {
    console.error('Promo Banner 생성 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

/**
 * Promo Banner 업데이트
 */
export async function updatePromoBanner(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const id = formData.get('id') as string
    const title = formData.get('title') as string
    const content = formData.get('content') as string
    const imageUrl = formData.get('image_url') as string
    const linkUrl = formData.get('link_url') as string
    const isActive = formData.get('is_active') === 'true'
    const startDate = formData.get('start_date') as string
    const endDate = formData.get('end_date') as string

    if (!id || !title || !content) {
      return {
        success: false,
        error: 'ID, 제목, 내용은 필수입니다.',
      }
    }

    const { data, error } = await supabase
      .from('select_promo_banners')
      .update({
        title,
        content,
        image_url: imageUrl || null,
        link_url: linkUrl || null,
        is_active: isActive,
        start_date: startDate || null,
        end_date: endDate || null,
      })
      .eq('id', Number(id))
      .select()
      .single()

    if (error) {
      console.error('Promo Banner 업데이트 오류:', error)
      return {
        success: false,
        error: `업데이트에 실패했습니다: ${error.message}`,
      }
    }

    revalidatePath('/admin/advertisements')

    return {
      success: true,
      data: { banner: data },
    }
  } catch (error) {
    console.error('Promo Banner 업데이트 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

/**
 * Promo Banner 삭제
 */
export async function deletePromoBanner(id: number): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('select_promo_banners')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Promo Banner 삭제 오류:', error)
      return {
        success: false,
        error: `삭제에 실패했습니다: ${error.message}`,
      }
    }

    revalidatePath('/admin/advertisements')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Promo Banner 삭제 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

