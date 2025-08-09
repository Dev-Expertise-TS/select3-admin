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

    const supabase = createServiceRoleClient()

    // 통합(all) 모드: 영문/한글명 모두에서 제안 수집 + 숫자면 Sabre ID 일치 항목 포함
    if (field === 'all') {
      const set = new Set<string>()
      const suggestions: string[] = []

      // Sabre ID (정수형) 정확 일치가 있으면 우선 추가
      if (/^\d+$/.test(q)) {
        const { data: idRows, error: idErr } = await supabase
          .from('select_hotels')
          .select('sabre_id')
          .eq('sabre_id', Number(q))
          .limit(1)
        if (!idErr && (idRows?.length ?? 0) > 0) {
          set.add(q)
          suggestions.push(q)
        }
      }

      // 영문명
      const { data: engRows } = await supabase
        .from('select_hotels')
        .select('property_name_eng')
        .ilike('property_name_eng', `%${q}%`)
        .not('property_name_eng', 'is', null)
        .order('property_name_eng', { ascending: true })
        .limit(100)
      for (const row of engRows || []) {
        const value = (row as Record<string, string | null>)['property_name_eng']
        if (typeof value === 'string' && value && !set.has(value)) {
          set.add(value)
          suggestions.push(value)
          if (suggestions.length >= limit) break
        }
      }
      if (suggestions.length < limit) {
        // 한글명 추가 수집
        const { data: korRows } = await supabase
          .from('select_hotels')
          .select('property_name_kor')
          .ilike('property_name_kor', `%${q}%`)
          .not('property_name_kor', 'is', null)
          .order('property_name_kor', { ascending: true })
          .limit(100)
        for (const row of korRows || []) {
          const value = (row as Record<string, string | null>)['property_name_kor']
          if (typeof value === 'string' && value && !set.has(value)) {
            set.add(value)
            suggestions.push(value)
            if (suggestions.length >= limit) break
          }
        }
      }

      return NextResponse.json<SuggestResponse>({ success: true, data: suggestions.slice(0, limit) }, { status: 200 })
    }

    // 단일 필드 모드(eng|kor)
    const column = field === 'kor' ? 'property_name_kor' : 'property_name_eng'
    const { data, error } = await supabase
      .from('select_hotels')
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

