import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const id = Number(formData.get('id'))
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    const supabase = createServiceRoleClient()
    const { error } = await supabase.from('hotel_chains').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/admin/chain-brand')
    return NextResponse.redirect(new URL('/admin/chain-brand', request.url))
  } catch {
    return NextResponse.redirect(new URL('/admin/chain-brand?error=1', request.url))
  }
}


