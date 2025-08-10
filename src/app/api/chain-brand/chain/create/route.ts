import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST() {
  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from('hotel_chains').insert({ chain_code: 'NEW', name_kr: null, name_en: null })
    if (error) throw error
    revalidatePath('/admin/chain-brand')
    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}


