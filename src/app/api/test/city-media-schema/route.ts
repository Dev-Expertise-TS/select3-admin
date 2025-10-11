import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    // 테이블 존재 확인 및 컬럼 정보 조회
    const { data: testData, error: testError } = await supabase
      .from('select_city_media')
      .select('*')
      .limit(1)

    if (testError) {
      return NextResponse.json({
        success: false,
        error: `테이블 접근 오류: ${testError.message}`,
        code: testError.code,
        details: testError.details,
        hint: testError.hint,
      })
    }

    // 컬럼 정보 확인
    const columns = testData && testData.length > 0 ? Object.keys(testData[0]) : []

    // 샘플 데이터
    const sampleData = testData && testData.length > 0 ? testData[0] : null

    return NextResponse.json({
      success: true,
      tableExists: true,
      columns,
      columnCount: columns.length,
      sampleData,
      message: 'select_city_media 테이블 스키마 조회 완료'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    }, { status: 500 })
  }
}

