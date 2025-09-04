import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sabreId = searchParams.get('sabre_id')
    
    if (!sabreId) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID가 필요합니다' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    
    // 호텔 데이터 조회
    const { data: hotel, error } = await supabase
      .from('select_hotels')
      .select('*')
      .eq('sabre_id', sabreId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: '해당 Sabre ID의 호텔을 찾을 수 없습니다' },
          { status: 404 }
        )
      }
      
      console.error('호텔 데이터 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '호텔 데이터 조회 중 오류가 발생했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data: hotel },
      { status: 200 }
    )

  } catch (error) {
    console.error('호텔 데이터 조회 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
