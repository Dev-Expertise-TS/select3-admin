import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const pkField = (form.get('pkField') as string | null) ?? null
    const pkValue = (form.get('pkValue') as string | null) ?? null
    const updates: Record<string, string | null> = {}
    for (const [key, value] of form.entries()) {
      if (key === 'pkField' || key === 'pkValue') continue
      if (typeof value === 'string') updates[key] = value === '' ? null : value
    }
    if (!pkField || !pkValue) return NextResponse.json({ success: false, error: 'pkField/pkValue required' }, { status: 400 })
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from('select_hotel_benefits').update(updates).eq(pkField, pkValue)
    if (error) return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}


