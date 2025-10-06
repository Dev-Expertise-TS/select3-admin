import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    
    // select_hotels 테이블의 샘플 데이터 조회
    const { data, error } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en')
      .limit(10)

    if (error) {
      console.error('호텔 데이터 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '호텔 데이터를 조회할 수 없습니다.', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    })

  } catch (error) {
    console.error('호텔 데이터 테스트 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
