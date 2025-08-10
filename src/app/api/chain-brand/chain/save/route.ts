import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const id = Number(formData.get('id'))
    const chain_code = String(formData.get('chain_code') ?? '')
    const name_kr = String(formData.get('name_kr') ?? '')
    const name_en = String(formData.get('name_en') ?? '')

    if (!id || !chain_code) {
      return NextResponse.json({ success: false, error: 'id and chain_code are required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('hotel_chains')
      .update({ chain_code, name_kr: name_kr || null, name_en: name_en || null })
      .eq('id', id)
    if (error) throw error

    revalidatePath('/admin/chain-brand')
    return NextResponse.redirect(new URL('/admin/chain-brand', request.url))
  } catch {
    return NextResponse.redirect(new URL('/admin/chain-brand?error=1', request.url))
  }
}


