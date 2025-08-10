import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { pkField?: string; pkValue?: string }
    const pkField = body.pkField
    const pkValue = body.pkValue
    if (!pkField || !pkValue) {
      return NextResponse.json({ success: false, error: 'pkField and pkValue are required' }, { status: 400 })
    }
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from('select_hotel_benefits').delete().eq(pkField, pkValue)
    if (error) return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
    return NextResponse.json({ success: true }, { status: 204 })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}


