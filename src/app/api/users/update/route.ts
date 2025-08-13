import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { UserUpdateRequest, AuthResponse } from '@/types/auth'

export async function PATCH(request: NextRequest) {
  try {
    const body: UserUpdateRequest = await request.json()
    
    if (!body.id) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '사용자 ID가 필요합니다.'
        },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    
    // 사용자 메타데이터 업데이트
    if (body.role) {
      const { error: metadataError } = await supabase.auth.admin.updateUserById(
        body.id,
        {
          user_metadata: { role: body.role }
        }
      )

      if (metadataError) {
        console.error('사용자 메타데이터 업데이트 오류:', metadataError)
        return NextResponse.json<AuthResponse>(
          {
            success: false,
            error: '사용자 역할 업데이트에 실패했습니다.'
          },
          { status: 500 }
        )
      }
    }

    // 비밀번호 변경이 요청된 경우
    if (body.password) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        body.id,
        { password: body.password }
      )

      if (passwordError) {
        console.error('비밀번호 변경 오류:', passwordError)
        return NextResponse.json<AuthResponse>(
          {
            success: false,
            error: '비밀번호 변경에 실패했습니다.'
          },
          { status: 500 }
        )
      }
    }

    // 업데이트된 사용자 정보 조회
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(body.id)
    
    if (authError) {
      console.error('인증 사용자 조회 오류:', authError)
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '업데이트된 사용자 정보를 가져오는데 실패했습니다.'
        },
        { status: 500 }
      )
    }

    const updatedUser: AuthResponse['data'] = {
      id: authData.user!.id,
      email: authData.user!.email!,
      role: authData.user!.user_metadata?.role || 'user',
      created_at: authData.user!.created_at,
      last_sign_in_at: authData.user!.last_sign_in_at,
      email_confirmed_at: authData.user!.email_confirmed_at,
      updated_at: authData.user!.updated_at
    }

    return NextResponse.json<AuthResponse>(
      {
        success: true,
        data: updatedUser
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('사용자 업데이트 API 오류:', error)
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        error: '서버 오류가 발생했습니다.'
      },
      { status: 500 }
    )
  }
}
