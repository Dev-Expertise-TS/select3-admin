import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { SignUpCredentials, AuthResponse } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    const body: SignUpCredentials = await request.json()
    
    // ✅ 이메일과 패스워드 앞뒤 공백 제거
    const trimmedEmail = body.email?.trim()
    const trimmedPassword = body.password?.trim()
    
    if (!trimmedEmail || !trimmedPassword) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '이메일과 비밀번호를 입력해주세요.'
        },
        { status: 400 }
      )
    }

    if (trimmedPassword.length < 6) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '비밀번호는 최소 6자 이상이어야 합니다.'
        },
        { status: 400 }
      )
    }

    console.log('📝 회원가입 API 호출:', {
      email: trimmedEmail,
      passwordLength: trimmedPassword.length
    })

    const supabase = createServiceRoleClient()
    
    // 사용자 계정 생성
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: trimmedEmail,
      password: trimmedPassword,
      email_confirm: true // 이메일 확인 자동 완료
    })

    if (authError) {
      console.error('사용자 생성 오류:', authError)
      
      if (authError.message.includes('already registered')) {
        return NextResponse.json<AuthResponse>(
          {
            success: false,
            error: '이미 등록된 이메일입니다.'
          },
          { status: 409 }
        )
      }
      
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '사용자 생성 중 오류가 발생했습니다.'
        },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '사용자 계정 생성에 실패했습니다.'
        },
        { status: 500 }
      )
    }

    // 사용자 메타데이터에 역할 추가
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authData.user.id,
      {
        user_metadata: { role: body.role || 'user' }
      }
    )

    if (updateError) {
      console.error('사용자 메타데이터 업데이트 오류:', updateError)
      // 메타데이터 업데이트 실패시 사용자 계정 삭제
      await supabase.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '사용자 역할 설정에 실패했습니다.'
        },
        { status: 500 }
      )
    }

    const authUser: AuthResponse['data'] = {
      id: authData.user.id,
      email: authData.user.email!,
      role: body.role || 'user',
      created_at: authData.user.created_at,
      last_sign_in_at: authData.user.last_sign_in_at,
      email_confirmed_at: authData.user.email_confirmed_at,
      updated_at: authData.user.updated_at
    }

    return NextResponse.json<AuthResponse>(
      {
        success: true,
        data: authUser
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('사용자 생성 API 오류:', error)
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        error: '서버 오류가 발생했습니다.'
      },
      { status: 500 }
    )
  }
}
