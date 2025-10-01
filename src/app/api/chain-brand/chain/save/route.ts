import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const chain_id = Number(formData.get('chain_id'))
    const name_kr = String(formData.get('name_kr') ?? '')
    const name_en = String(formData.get('name_en') ?? '')
    const slug = String(formData.get('slug') ?? '')

    if (!chain_id) {
      return NextResponse.json({ success: false, error: 'chain_id is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('hotel_chains')
      .update({ 
        chain_name_kr: name_kr || null, 
        chain_name_en: name_en || null,
        slug: slug || null
      })
      .eq('chain_id', chain_id)
    if (error) throw error

    revalidatePath('/admin/chain-brand')
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[chain-save] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}


