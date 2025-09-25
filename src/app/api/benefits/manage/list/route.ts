import { createServiceRoleClient } from '@/lib/supabase/server'
import { createApiSuccessResponse, createApiErrorResponse } from '@/lib/api-utils'
import type { BenefitRow } from '@/types/benefits'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    
    const { data, error } = await supabase
      .from('select_hotel_benefits')
      .select('*')
      .order('benefit_id', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return createApiErrorResponse('데이터를 가져오는데 실패했습니다.', 500)
    }

    const benefits = (data as BenefitRow[]) ?? []
    return createApiSuccessResponse(benefits)
  } catch (error) {
    console.error('API error:', error)
    return createApiErrorResponse('서버 오류가 발생했습니다.', 500)
  }
}


