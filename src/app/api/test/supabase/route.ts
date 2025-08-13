import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    console.log('🔗 Supabase 연결 테스트 시작')
    
    const supabase = createServiceRoleClient()
    console.log('✅ Supabase 클라이언트 생성 완료')
    
    // 간단한 쿼리 테스트 - auth.users는 직접 쿼리할 수 없음
    // 대신 auth.admin.listUsers()를 사용
    const { data: users, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    })
    
    if (error) {
      console.error('❌ Supabase 쿼리 오류:', error)
      return NextResponse.json({
        success: false,
        error: 'Supabase 연결 실패',
        details: error.message
      }, { status: 500 })
    }
    
    console.log('✅ Supabase 연결 성공')
    return NextResponse.json({
      success: true,
      message: 'Supabase 연결이 정상적으로 작동합니다.',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Supabase 테스트 중 예외 발생:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}
