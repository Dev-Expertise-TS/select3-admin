import { createServiceRoleClient } from '@/lib/supabase/server'
import { createApiSuccessResponse, createApiErrorResponse, withErrorHandling, parseFormData } from '@/lib/api-utils'
import type { BenefitFormData } from '@/types/benefits'

export const POST = withErrorHandling(async (request: Request) => {
  const formData = await request.formData()
  const parsedData = parseFormData(formData) as Partial<BenefitFormData>
  
  const { pkField, pkValue, ...updates } = parsedData
  
  if (!pkField || !pkValue) {
    return createApiErrorResponse('pkField/pkValue가 필요합니다.', 400)
  }

  const supabase = createServiceRoleClient()
  
  const { error } = await supabase
    .from('select_hotel_benefits')
    .update(updates)
    .eq(pkField, pkValue)

  if (error) {
    throw error
  }

  return createApiSuccessResponse(null, 200)
})


