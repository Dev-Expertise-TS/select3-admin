import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const name_kr = String(formData.get('name_kr') ?? '').trim()
    const name_en = String(formData.get('name_en') ?? '').trim()

    if (!name_kr && !name_en) {
      return NextResponse.json({ 
        success: false, 
        error: '체인(한글) 또는 체인(영문) 중 하나는 입력해야 합니다.' 
      }, { status: 422 })
    }

    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('hotel_chains')
      .insert({ chain_name_kr: name_kr || null, chain_name_en: name_en || null })
      .select('*')
      .single()
    
    if (error) throw error
    
    revalidatePath('/admin/chain-brand')
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('[chain-create] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}


