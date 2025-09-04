import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tableName = searchParams.get('table') || 'select_hotels'
    
    const supabase = createServiceRoleClient()
    
    // 테이블의 모든 컬럼 정보 조회
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    if (error) {
      console.error('테이블 스키마 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '테이블 스키마 조회 중 오류가 발생했습니다' },
        { status: 500 }
      )
    }

    // 첫 번째 레코드가 있으면 컬럼명 추출
    const columns = data && data.length > 0 ? Object.keys(data[0]) : []
    
    return NextResponse.json(
      { 
        success: true, 
        table: tableName,
        columns: columns,
        sampleData: data && data.length > 0 ? data[0] : null
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('테이블 스키마 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
