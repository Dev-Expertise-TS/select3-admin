'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

export async function createBasicBenefit(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()
    const entries: Array<[string, string]> = []
    
    for (const [key, value] of formData.entries()) {
      if (['pkField', 'pkValue', 'field', 'value'].includes(key)) continue
      if (typeof value === 'string') {
        const v = value.trim()
        if (v.length === 0) continue
        entries.push([key, v])
      }
    }
    
    if (entries.length === 0) {
      return {
        success: false,
        error: '입력할 데이터가 없습니다.',
      }
    }
    
    const insertData = Object.fromEntries(entries) as Record<string, string>
    const { error } = await supabase.from('select_hotel_benefits').insert(insertData)
    
    if (error) {
      console.error('혜택 생성 오류:', error)
      return {
        success: false,
        error: `혜택 생성에 실패했습니다: ${error.message}`,
      }
    }
    
    revalidatePath('/admin/benefits/manage')
    
    return {
      success: true,
    }
  } catch (error) {
    console.error('혜택 생성 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

export async function updateBasicBenefitCell(formData: FormData): Promise<ActionResult> {
  try {
    const pkField = formData.get('pkField') as string
    const pkValue = formData.get('pkValue') as string
    const field = formData.get('field') as string
    const value = (formData.get('value') as string) ?? ''
    
    if (!pkField || !pkValue || !field) {
      return {
        success: false,
        error: '필수 필드가 누락되었습니다.',
      }
    }
    
    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('select_hotel_benefits')
      .update({ [field]: value === '' ? null : value })
      .eq(pkField, pkValue)
    
    if (error) {
      console.error('혜택 업데이트 오류:', error)
      return {
        success: false,
        error: `업데이트에 실패했습니다: ${error.message}`,
      }
    }
    
    revalidatePath('/admin/benefits/manage')
    
    return {
      success: true,
    }
  } catch (error) {
    console.error('혜택 업데이트 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

export async function updateBasicBenefitRow(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()
    const pkField = formData.get('pkField') as string
    const pkValue = formData.get('pkValue') as string
    
    if (!pkField || !pkValue) {
      return {
        success: false,
        error: '필수 필드가 누락되었습니다.',
      }
    }
    
    const updates: Record<string, string | null> = {}
    for (const [key, value] of formData.entries()) {
      if (key === 'pkField' || key === 'pkValue') continue
      if (typeof value === 'string') {
        updates[key] = value === '' ? null : value
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return {
        success: false,
        error: '업데이트할 데이터가 없습니다.',
      }
    }
    
    const { error } = await supabase
      .from('select_hotel_benefits')
      .update(updates)
      .eq(pkField, pkValue)
    
    if (error) {
      console.error('혜택 행 업데이트 오류:', error)
      return {
        success: false,
        error: `업데이트에 실패했습니다: ${error.message}`,
      }
    }
    
    revalidatePath('/admin/benefits/manage')
    
    return {
      success: true,
    }
  } catch (error) {
    console.error('혜택 행 업데이트 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

export async function deleteBasicBenefit(formData: FormData): Promise<ActionResult> {
  try {
    const pkField = formData.get('pkField') as string
    const pkValue = formData.get('pkValue') as string
    
    if (!pkField || !pkValue) {
      return {
        success: false,
        error: '필수 필드가 누락되었습니다.',
      }
    }
    
    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('select_hotel_benefits')
      .delete()
      .eq(pkField, pkValue)
    
    if (error) {
      console.error('혜택 삭제 오류:', error)
      return {
        success: false,
        error: `삭제에 실패했습니다: ${error.message}`,
      }
    }
    
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


