'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type BenefitFormData = {
  benefit_id?: number
  name_kr: string
  name_en?: string
  description_kr?: string
  description_en?: string
}

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * 혜택 저장 (생성 또는 수정)
 * benefit_id가 있으면 업데이트, 없으면 생성
 */
export async function saveBenefit(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    // FormData에서 데이터 추출
    const benefitId = formData.get('benefit_id')
    const nameKr = formData.get('name_kr') as string
    const nameEn = formData.get('name_en') as string
    const descriptionKr = formData.get('description_kr') as string
    const descriptionEn = formData.get('description_en') as string

    // 필수 필드 검증
    if (!nameKr || nameKr.trim() === '') {
      return {
        success: false,
        error: '혜택명(한글)은 필수입니다.',
      }
    }

    const benefit = {
      name_kr: nameKr.trim(),
      name_en: nameEn?.trim() || null,
      description_kr: descriptionKr?.trim() || null,
      description_en: descriptionEn?.trim() || null,
    }

    let result

    if (benefitId && benefitId !== '') {
      // 업데이트
      const { data, error } = await supabase
        .from('select_hotel_benefits')
        .update(benefit)
        .eq('benefit_id', Number(benefitId))
        .select()
        .single()

      if (error) {
        console.error('혜택 업데이트 오류:', error)
        return {
          success: false,
          error: `혜택 업데이트에 실패했습니다: ${error.message}`,
        }
      }

      result = data
    } else {
      // 생성
      const { data, error } = await supabase
        .from('select_hotel_benefits')
        .insert(benefit)
        .select()
        .single()

      if (error) {
        console.error('혜택 생성 오류:', error)
        return {
          success: false,
          error: `혜택 생성에 실패했습니다: ${error.message}`,
        }
      }

      result = data
    }

    // 캐시 무효화
    revalidatePath('/admin/benefits')
    revalidatePath('/admin/benefits/manage')

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('혜택 저장 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

/**
 * 혜택 삭제
 */
export async function deleteBenefit(benefitId: number): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    // 먼저 호텔-혜택 매핑이 있는지 확인
    const { data: mappings, error: mappingError } = await supabase
      .from('select_hotel_benefits_map')
      .select('sabre_id')
      .eq('benefit_id', benefitId)
      .limit(1)

    if (mappingError) {
      console.error('매핑 확인 오류:', mappingError)
      return {
        success: false,
        error: '혜택 매핑 확인에 실패했습니다.',
      }
    }

    if (mappings && mappings.length > 0) {
      return {
        success: false,
        error: '이 혜택은 호텔과 연결되어 있어 삭제할 수 없습니다. 먼저 호텔 연결을 해제해주세요.',
      }
    }

    // 삭제
    const { error } = await supabase
      .from('select_hotel_benefits')
      .delete()
      .eq('benefit_id', benefitId)

    if (error) {
      console.error('혜택 삭제 오류:', error)
      return {
        success: false,
        error: `혜택 삭제에 실패했습니다: ${error.message}`,
      }
    }

    // 캐시 무효화
    revalidatePath('/admin/benefits')
    revalidatePath('/admin/benefits/manage')

    return {
      success: true,
    }
  } catch (error) {
    console.error('혜택 삭제 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

/**
 * 혜택 목록 조회 (선택적 - TanStack Query 사용 시 API 유지 가능)
 */
export async function getBenefits(): Promise<ActionResult<BenefitFormData[]>> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_hotel_benefits')
      .select('*')
      .order('benefit_id', { ascending: true })

    if (error) {
      console.error('혜택 목록 조회 오류:', error)
      return {
        success: false,
        error: '혜택 목록 조회에 실패했습니다.',
      }
    }

    return {
      success: true,
      data: data || [],
    }
  } catch (error) {
    console.error('혜택 목록 조회 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

