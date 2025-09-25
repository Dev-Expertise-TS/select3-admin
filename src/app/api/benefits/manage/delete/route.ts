import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { pkField?: string; pkValue?: string }
    const pkField = body.pkField
    const pkValue = body.pkValue
    
    console.log('Delete request:', { pkField, pkValue })
    
    if (!pkField || !pkValue) {
      return NextResponse.json({ success: false, error: 'pkField and pkValue are required' }, { status: 400 })
    }
    
    const supabase = createServiceRoleClient()
    
    // 1. 먼저 연관된 매핑 테이블에서 해당 혜택을 사용하는 레코드들을 삭제
    const { error: mapError, count: mapCount } = await supabase
      .from('select_hotel_benefits_map')
      .delete()
      .eq('benefit_id', pkValue)
    
    if (mapError) {
      console.error('Delete mapping error:', mapError)
      return NextResponse.json({ 
        success: false, 
        error: `매핑 테이블 삭제 실패: ${mapError.message}` 
      }, { status: 500 })
    }
    
    console.log(`Deleted ${mapCount} mapping records`)
    
    // 2. 그 다음 혜택 테이블에서 해당 혜택을 삭제
    const { error, count } = await supabase
      .from('select_hotel_benefits')
      .delete()
      .eq(pkField, pkValue)
    
    console.log('Delete result:', { error, count })
    
    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json({ 
        success: false, 
        error: `혜택 삭제 실패: ${error.message}` 
      }, { status: 500 })
    }
    
    if (count === 0) {
      return NextResponse.json({ 
        success: false, 
        error: '삭제할 혜택을 찾을 수 없습니다.' 
      }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true, 
      deleted: count,
      deletedMappings: mapCount || 0,
      message: `혜택과 ${mapCount || 0}개의 호텔 매핑이 삭제되었습니다.`
    }, { status: 200 })
  } catch (error) {
    console.error('Delete API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}


