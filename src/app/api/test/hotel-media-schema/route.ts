import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    // 1. 테이블 존재 확인
    const { data: testData, error: testError } = await supabase
      .from('select_hotel_media')
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

    // 2. 컬럼 정보 확인
    const columns = testData && testData.length > 0 ? Object.keys(testData[0]) : []

    // 3. 테스트 레코드 삽입 시도
    const testRecord = {
      sabre_id: 'TEST_123',
      file_name: 'test-file.jpg',
      file_path: 'test/path/test-file.jpg',
      storage_path: 'test/path/test-file.jpg',
      public_url: 'https://example.com/test.jpg',
      file_type: 'image/jpeg',
      file_size: 12345,
      slug: 'test-hotel',
    }

    const { data: insertData, error: insertError } = await supabase
      .from('select_hotel_media')
      .insert(testRecord)
      .select()

    if (insertError) {
      return NextResponse.json({
        success: false,
        tableExists: true,
        columns,
        insertTest: 'failed',
        insertError: {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        },
        testRecord,
      })
    }

    // 4. 테스트 레코드 삭제
    await supabase
      .from('select_hotel_media')
      .delete()
      .eq('sabre_id', 'TEST_123')

    return NextResponse.json({
      success: true,
      tableExists: true,
      columns,
      insertTest: 'success',
      insertedRecord: insertData,
      message: 'select_hotel_media 테이블이 정상적으로 작동합니다.',
    })
  } catch (e) {
    console.error('[test/hotel-media-schema] exception:', e)
    return NextResponse.json(
      { success: false, error: 'Internal server error', exception: String(e) },
      { status: 500 }
    )
  }
}
