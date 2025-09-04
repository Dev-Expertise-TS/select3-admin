import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tableName = searchParams.get('table') || 'select_hotels'
    
    const supabase = createServiceRoleClient()
    
    // 테이블의 컬럼 정보를 information_schema에서 조회
    const { data: columnInfo, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: tableName })

    if (columnError) {
      console.error('컬럼 정보 조회 오류:', columnError)
      // 대안: 샘플 데이터에서 null이 아닌 필드들 추정
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)

      if (sampleError) {
        return NextResponse.json(
          { success: false, error: '테이블 정보 조회 중 오류가 발생했습니다' },
          { status: 500 }
        )
      }

      // 샘플 데이터에서 null이 아닌 필드들을 not null로 추정
      const notNullFields = sampleData && sampleData.length > 0 
        ? Object.entries(sampleData[0])
            .filter(([_, value]) => value !== null && value !== undefined)
            .map(([key, _]) => key)
        : []

      return NextResponse.json(
        { 
          success: true, 
          table: tableName,
          notNullFields: notNullFields,
          sampleData: sampleData && sampleData.length > 0 ? sampleData[0] : null
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        table: tableName,
        columnInfo: columnInfo,
        notNullFields: columnInfo?.filter((col: { is_nullable: string; column_name: string }) => col.is_nullable === 'NO').map((col: { is_nullable: string; column_name: string }) => col.column_name) || []
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('테이블 스키마 상세 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
