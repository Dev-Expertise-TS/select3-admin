import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sabre_id, update_data } = body

    if (!sabre_id || !update_data || typeof update_data !== 'object') {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // 허용된 필드만 업데이트
    const allowedFields = [
      'area_code', 'area_ko', 'area_en',
      'city_code', 'city_ko', 'city_en',
      'country_code', 'country_ko', 'country_en',
      'continent_code', 'continent_ko', 'continent_en',
      'region_code', 'region_ko', 'region_en'
    ]

    // 필터링: 허용된 필드만 추출
    const filteredData: Record<string, string | null> = {}
    for (const [key, value] of Object.entries(update_data)) {
      if (allowedFields.includes(key)) {
        filteredData[key] = value as string | null
      } else {
        console.warn(`[hotel/update-region-data] Skipping invalid field: ${key}`)
      }
    }

    console.log('[hotel/update-region-data] Received update_data:', update_data)
    console.log('[hotel/update-region-data] Filtered data:', filteredData)

    if (Object.keys(filteredData).length === 0) {
      console.error('[hotel/update-region-data] No valid fields after filtering')
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    console.log(`[hotel/update-region-data] Updating sabre_id=${sabre_id} with:`, filteredData)

    const { error } = await supabase
      .from('select_hotels')
      .update(filteredData)
      .eq('sabre_id', sabre_id)

    if (error) {
      console.error(`[hotel/update-region-data] error for ${sabre_id}:`, error)
      // 컬럼이 존재하지 않는 경우 (42703) 더 자세한 에러 메시지
      if (error.code === '42703') {
        return NextResponse.json({ 
          success: false, 
          error: `컬럼이 존재하지 않습니다: ${error.message}. select_hotels 테이블에 해당 컬럼을 추가해주세요.` 
        }, { status: 500 })
      }
      return NextResponse.json({ success: false, error: `Database update failed: ${error.message}` }, { status: 500 })
    }

    console.log(`[hotel/update-region-data] Successfully updated sabre_id=${sabre_id}`)
    console.log(`[hotel/update-region-data] Updated fields:`, Object.keys(filteredData).join(', '))

    revalidatePath('/admin/region-mapping')
    revalidatePath('/admin/hotel-search')
    revalidatePath('/admin/hotel-update')

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[hotel/update-region-data] exception:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

