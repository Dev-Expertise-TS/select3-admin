import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const brand_id = Number(formData.get('id'))
    if (!brand_id) return NextResponse.json({ success: false, error: 'brand_id is required' }, { status: 400 })

    const supabase = createServiceRoleClient()
    const { error } = await supabase.from('hotel_brands').delete().eq('brand_id', brand_id)
    if (error) throw error

    revalidatePath('/admin/chain-brand')
    return NextResponse.redirect(new URL('/admin/chain-brand', request.url))
  } catch {
    return NextResponse.redirect(new URL('/admin/chain-brand?error=1', request.url))
  }
}


