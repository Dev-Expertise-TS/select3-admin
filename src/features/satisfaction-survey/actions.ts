'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * 고객 만족도 설문 저장 (생성 또는 수정)
 */
export async function saveSatisfactionSurvey(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const id = formData.get('id')
    const submittedAt = formData.get('submitted_at') as string
    const bookingNumber = formData.get('booking_number') as string
    const sabreId = formData.get('sabre_id') as string
    const propertyNameKr = formData.get('property_name_kr') as string
    const propertyNameEn = formData.get('property_name_en') as string
    const reviewText = formData.get('review_text') as string
    const satisfaction = formData.get('satisfaction') as string
    const earlyCheckIn = formData.get('early_check_in') as string
    const lateCheckOut = formData.get('late_check_out') as string
    const roomUpgrade = formData.get('room_upgrade') as string

    console.log('💾 설문 결과 저장:', {
      id,
      sabreId,
      propertyNameKr,
      propertyNameEn,
      satisfaction,
      earlyCheckIn,
      lateCheckOut,
      roomUpgrade
    })

    const surveyData: Record<string, unknown> = {
      submitted_at: submittedAt || null,
      booking_number: bookingNumber || null,
      sabre_id: sabreId ? Number(sabreId) : null,
      property_name_kr: propertyNameKr || null,
      property_name_en: propertyNameEn || null,
      review_text: reviewText || null,
      satisfaction: satisfaction === 'true' ? true : satisfaction === 'false' ? false : null,
      early_check_in: earlyCheckIn === 'true' ? true : earlyCheckIn === 'false' ? false : null,
      late_check_out: lateCheckOut === 'true' ? true : lateCheckOut === 'false' ? false : null,
      room_upgrade: roomUpgrade === 'true' ? true : roomUpgrade === 'false' ? false : null,
    }

    let result

    if (id && id !== '') {
      // 업데이트
      const { data, error } = await supabase
        .from('select_satisfaction_survey')
        .update(surveyData)
        .eq('id', Number(id))
        .select()
        .maybeSingle()

      if (error) {
        console.error('설문 업데이트 오류:', error)
        return {
          success: false,
          error: `업데이트에 실패했습니다: ${error.message}`,
        }
      }

      if (!data) {
        return {
          success: false,
          error: '레코드를 찾을 수 없습니다.',
        }
      }

      result = data
    } else {
      // 생성
      const { data, error } = await supabase
        .from('select_satisfaction_survey')
        .insert(surveyData)
        .select()
        .single()

      if (error) {
        console.error('설문 생성 오류:', error)
        return {
          success: false,
          error: `생성에 실패했습니다: ${error.message}`,
        }
      }

      result = data
    }

    revalidatePath('/admin/satisfaction-survey')

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('설문 저장 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

/**
 * 고객 만족도 설문 삭제
 */
export async function deleteSatisfactionSurvey(id: number): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('select_satisfaction_survey')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('설문 삭제 오류:', error)
      return {
        success: false,
        error: `삭제에 실패했습니다: ${error.message}`,
      }
    }

    revalidatePath('/admin/satisfaction-survey')

    return {
      success: true,
    }
  } catch (error) {
    console.error('설문 삭제 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

