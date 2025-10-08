import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sabre_id, code_field, code_value } = body

    if (!sabre_id || !code_field || !code_value) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // 허용된 code_field만 업데이트
    const allowedFields = ['city_code', 'country_code', 'continent_code', 'region_code']
    if (!allowedFields.includes(code_field)) {
      return NextResponse.json({ success: false, error: 'Invalid code field' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('select_hotels')
      .update({ [code_field]: code_value })
      .eq('sabre_id', sabre_id)

    if (error) {
      console.error(`[hotel/update-code] error for ${sabre_id}:`, error)
      return NextResponse.json({ success: false, error: 'Database update failed' }, { status: 500 })
    }

    revalidatePath('/admin/region-mapping')
    revalidatePath('/admin/hotel-search')
    revalidatePath('/admin/hotel-update')

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[hotel/update-code] exception:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

