import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { UserDeleteRequest } from '@/types/auth'

export async function DELETE(request: NextRequest) {
  try {
    const body: UserDeleteRequest = await request.json()
    
    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          error: '사용자 ID가 필요합니다.'
        },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    
    // 사용자 인증 계정 삭제 (프로필은 자동으로 삭제됨)

    // 사용자 인증 계정 삭제
    const { error: authError } = await supabase.auth.admin.deleteUser(body.id)

    if (authError) {
      console.error('인증 계정 삭제 오류:', authError)
      return NextResponse.json(
        {
          success: false,
          error: '사용자 인증 계정 삭제에 실패했습니다.'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: '사용자가 성공적으로 삭제되었습니다.'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('사용자 삭제 API 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다.'
      },
      { status: 500 }
    )
  }
}
