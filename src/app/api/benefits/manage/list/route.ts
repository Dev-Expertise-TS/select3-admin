import { createServiceRoleClient } from '@/lib/supabase/server'
import { createApiSuccessResponse, createApiErrorResponse, withErrorHandling } from '@/lib/api-utils'
import type { BenefitRow } from '@/types/benefits'

export const GET = withErrorHandling(async () => {
  const supabase = createServiceRoleClient()
  
  const { data, error } = await supabase
    .from('select_hotel_benefits')
    .select('benefit_id, benefit, benefit_description, start_date, end_date')
    .order('benefit', { ascending: true })

  if (error) {
    throw error
  }

  const benefits = (data as BenefitRow[]) ?? []
  return createApiSuccessResponse(benefits)
})


