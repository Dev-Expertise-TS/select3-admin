import { createServiceRoleClient } from '@/lib/supabase/server'
import { createApiSuccessResponse, createApiErrorResponse, withErrorHandling, parseFormData } from '@/lib/api-utils'
import type { BenefitFormData } from '@/types/benefits'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const parsedData = parseFormData(formData) as Partial<BenefitFormData>
    
    const { pkField, pkValue, ...updates } = parsedData
    
    console.log(`혜택 저장 API 호출 - ${pkField}: ${pkValue}`, updates)
    
    const supabase = createServiceRoleClient()
    
    // pkField와 pkValue가 있으면 업데이트, 없으면 새로 생성
    if (pkField && pkValue) {
      // 기존 혜택 업데이트
      const { error } = await supabase
        .from('select_hotel_benefits')
        .update(updates)
        .eq(pkField, pkValue)

      if (error) {
        console.error('Supabase update error:', error)
        return createApiErrorResponse('데이터 저장에 실패했습니다.', 500)
      }

      console.log(`혜택 저장 성공 - ${pkField}: ${pkValue}`)
    } else {
      // 새 혜택 생성
      const { data, error } = await supabase
        .from('select_hotel_benefits')
        .insert(updates)
        .select()

      if (error) {
        console.error('Supabase insert error:', error)
        return createApiErrorResponse('새 혜택 생성에 실패했습니다.', 500)
      }

      console.log(`새 혜택 생성 성공 - ID: ${data?.[0]?.benefit_id}`)
    }
    
    return createApiSuccessResponse(null, 200)
  } catch (error) {
    console.error('API error:', error)
    return createApiErrorResponse('서버 오류가 발생했습니다.', 500)
  }
}


