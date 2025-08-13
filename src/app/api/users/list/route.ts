import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { UserListResponse } from '@/types/auth'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    
    // 사용자 인증 정보 조회
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('인증 사용자 조회 오류:', authError)
      return NextResponse.json<UserListResponse>(
        {
          success: false,
          error: '사용자 목록을 가져오는데 실패했습니다.'
        },
        { status: 500 }
      )
    }

    // auth.users 데이터를 User 타입으로 변환
    const users = authUsers.users.map(authUser => ({
      id: authUser.id,
      email: authUser.email!,
      role: authUser.user_metadata?.role || 'user',
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at,
      email_confirmed_at: authUser.email_confirmed_at,
      updated_at: authUser.updated_at
    }))

    return NextResponse.json<UserListResponse>(
      {
        success: true,
        data: users,
        meta: {
          count: users.length
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('사용자 목록 API 오류:', error)
    return NextResponse.json<UserListResponse>(
      {
        success: false,
        error: '서버 오류가 발생했습니다.'
      },
      { status: 500 }
    )
  }
}
