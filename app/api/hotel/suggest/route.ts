import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface SuggestResponse {
  success: boolean
  data?: string[]
  error?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const field = (searchParams.get('field') || 'eng').toLowerCase()
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(20, Math.max(1, Number(searchParams.get('limit') || 8)))

    if (!q) {
      return NextResponse.json<SuggestResponse>({ success: true, data: [] }, { status: 200 })
    }

    const column = field === 'kor' ? 'property_name_kor' : 'property_name_eng'
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('hotel')
      .select(`${column}`)
      .ilike(column, `%${q}%`)
      .not(column, 'is', null)
      .order(column, { ascending: true })
      .limit(100)

    if (error) {
      return NextResponse.json<SuggestResponse>({ success: false, error: error.message }, { status: 500 })
    }

    const set = new Set<string>()
    const suggestions: string[] = []
    for (const row of data || []) {
      const value = (row as Record<string, string | null>)[column]
      if (typeof value === 'string' && value && !set.has(value)) {
        set.add(value)
        suggestions.push(value)
        if (suggestions.length >= limit) break
      }
    }

    return NextResponse.json<SuggestResponse>({ success: true, data: suggestions }, { status: 200 })
  } catch (err) {
    return NextResponse.json<SuggestResponse>({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

