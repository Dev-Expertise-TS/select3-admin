'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type PromotionFormData = {
  promotion_id?: number
  promotion: string
  promotion_description?: string
  note?: string
  booking_start_date?: string
  booking_end_date?: string
  check_in_start_date?: string
  check_in_end_date?: string
}

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * 프로모션 저장 (생성 또는 수정)
 * promotion_id가 있으면 업데이트, 없으면 생성
 */
export async function savePromotion(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    // FormData에서 데이터 추출
    const promotionId = formData.get('promotion_id')
    const promotion = formData.get('promotion') as string
    const promotionDescription = formData.get('promotion_description') as string
    const note = formData.get('note') as string
    const bookingStartDate = formData.get('booking_start_date') as string
    const bookingEndDate = formData.get('booking_end_date') as string
    const checkInStartDate = formData.get('check_in_start_date') as string
    const checkInEndDate = formData.get('check_in_end_date') as string

    // 필수 필드 검증
    if (!promotion || promotion.trim() === '') {
      return {
        success: false,
        error: '프로모션명은 필수입니다.',
      }
    }

    // Upsert 데이터 준비
    const upsertData = promotionId && promotionId !== ''
      ? {
          promotion_id: Number(promotionId),
          promotion: promotion.trim(),
          promotion_description: promotionDescription?.trim() || null,
          note: note?.trim() || null,
          booking_start_date: bookingStartDate || null,
          booking_end_date: bookingEndDate || null,
          check_in_start_date: checkInStartDate || null,
          check_in_end_date: checkInEndDate || null,
        }
      : {
          promotion: promotion.trim(),
          promotion_description: promotionDescription?.trim() || null,
          note: note?.trim() || null,
          booking_start_date: bookingStartDate || null,
          booking_end_date: bookingEndDate || null,
          check_in_start_date: checkInStartDate || null,
          check_in_end_date: checkInEndDate || null,
        }

    // Upsert 실행 (존재하면 업데이트, 없으면 생성)
    const { data, error } = await supabase
      .from('select_hotel_promotions')
      .upsert(upsertData, { onConflict: 'promotion_id' })
      .select()

    if (error) {
      console.error('프로모션 저장 오류:', error)
      return {
        success: false,
        error: `프로모션 저장에 실패했습니다: ${error.message}`,
      }
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: '프로모션 저장 후 데이터를 가져올 수 없습니다.',
      }
    }

    const result = data[0]

    // 캐시 무효화
    revalidatePath('/admin/promotions')

    return {
      success: true,
      data: { promotion: result },
    }
  } catch (error) {
    console.error('프로모션 저장 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

/**
 * 프로모션 삭제
 */
export async function deletePromotion(promotionId: number): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    // 먼저 호텔 매핑이 있는지 확인
    const { data: mappings, error: mappingError } = await supabase
      .from('select_hotel_promotions_map')
      .select('sabre_id')
      .eq('promotion_id', promotionId)
      .limit(1)

    if (mappingError) {
      console.error('매핑 확인 오류:', mappingError)
      return {
        success: false,
        error: '프로모션 매핑 확인에 실패했습니다.',
      }
    }

    if (mappings && mappings.length > 0) {
      return {
        success: false,
        error: '이 프로모션은 호텔과 연결되어 있어 삭제할 수 없습니다. 먼저 호텔 연결을 해제해주세요.',
      }
    }

    // 삭제
    const { error } = await supabase
      .from('select_hotel_promotions')
      .delete()
      .eq('promotion_id', promotionId)

    if (error) {
      console.error('프로모션 삭제 오류:', error)
      return {
        success: false,
        error: `프로모션 삭제에 실패했습니다: ${error.message}`,
      }
    }

    // 캐시 무효화
    revalidatePath('/admin/promotions')

    return {
      success: true,
    }
  } catch (error) {
    console.error('프로모션 삭제 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

/**
 * 호텔-프로모션 매핑 추가
 */
export async function addHotelToPromotion(
  promotionId: number,
  sabreId: string
): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    // 중복 확인
    const { data: existing } = await supabase
      .from('select_hotel_promotions_map')
      .select('*')
      .eq('promotion_id', promotionId)
      .eq('sabre_id', sabreId)
      .limit(1)

    if (existing && existing.length > 0) {
      return {
        success: false,
        error: '이미 연결된 호텔입니다.',
      }
    }

    // 매핑 추가
    const { error } = await supabase
      .from('select_hotel_promotions_map')
      .insert({
        promotion_id: promotionId,
        sabre_id: sabreId,
      })

    if (error) {
      console.error('호텔 매핑 추가 오류:', error)
      return {
        success: false,
        error: `호텔 연결에 실패했습니다: ${error.message}`,
      }
    }

    // 캐시 무효화
    revalidatePath('/admin/promotions')

    return {
      success: true,
    }
  } catch (error) {
    console.error('호텔 매핑 추가 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

/**
 * 호텔-프로모션 매핑 제거
 */
export async function removeHotelFromPromotion(
  promotionId: number,
  sabreId: string
): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('select_hotel_promotions_map')
      .delete()
      .eq('promotion_id', promotionId)
      .eq('sabre_id', sabreId)

    if (error) {
      console.error('호텔 매핑 제거 오류:', error)
      return {
        success: false,
        error: `호텔 연결 해제에 실패했습니다: ${error.message}`,
      }
    }

    // 캐시 무효화
    revalidatePath('/admin/promotions')

    return {
      success: true,
    }
  } catch (error) {
    console.error('호텔 매핑 제거 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

