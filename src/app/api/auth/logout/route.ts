import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = createServiceRoleClient()
    
    // 로그아웃 처리
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('로그아웃 오류:', error)
      return NextResponse.json(
        {
          success: false,
          error: '로그아웃 중 오류가 발생했습니다.'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: '로그아웃되었습니다.'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('로그아웃 API 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다.'
      },
      { status: 500 }
    )
  }
}
