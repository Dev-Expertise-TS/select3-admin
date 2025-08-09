import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

type Row = {
  benefit: string | null
  benefit_description: string | null
  start_date: string | null
  end_date: string | null
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('select_basic_benefits')
      .select('benefit, benefit_description, start_date, end_date')
      .order('benefit', { ascending: true })

    if (error) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json<ApiResponse<Row[]>>({ success: true, data: (data as Row[]) ?? [] }, { status: 200 })
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}


