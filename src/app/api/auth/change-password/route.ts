import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuthResponse } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 패스워드 변경 API 호출 시작')
    
    let body: { currentPassword: string; newPassword: string }
    try {
      body = await request.json()
      console.log('📝 요청 데이터 파싱 성공:', { 
        hasCurrentPassword: !!body.currentPassword,
        hasNewPassword: !!body.newPassword 
      })
    } catch (parseError) {
      console.error('❌ JSON 파싱 오류:', parseError)
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '잘못된 요청 형식입니다.'
        },
        { status: 400 }
      )
    }
    
    // ✅ 패스워드 앞뒤 공백 제거
    const trimmedCurrentPassword = body.currentPassword?.trim()
    const trimmedNewPassword = body.newPassword?.trim()
    
    if (!trimmedCurrentPassword || !trimmedNewPassword) {
      console.log('❌ 필수 필드 누락:', { 
        hasCurrentPassword: !!trimmedCurrentPassword, 
        hasNewPassword: !!trimmedNewPassword
      })
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.'
        },
        { status: 400 }
      )
    }

    // 새 비밀번호 유효성 검사
    if (trimmedNewPassword.length < 6) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '새 비밀번호는 최소 6자 이상이어야 합니다.'
        },
        { status: 400 }
      )
    }

    // 현재 비밀번호와 새 비밀번호가 같은지 확인
    if (trimmedCurrentPassword === trimmedNewPassword) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '새 비밀번호는 현재 비밀번호와 달라야 합니다.'
        },
        { status: 400 }
      )
    }

    console.log('🔗 Supabase 클라이언트 생성 중...')
    
    const supabase = createClient()

    // 현재 세션 확인
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.error('❌ 세션 확인 오류:', sessionError)
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '로그인이 필요합니다. 다시 로그인해주세요.'
        },
        { status: 401 }
      )
    }

    console.log('✅ 세션 확인 완료:', { userId: session.user.id, email: session.user.email })

    // 현재 비밀번호 확인 (재로그인으로 검증)
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: session.user.email!,
      password: trimmedCurrentPassword
    })

    if (verifyError) {
      console.error('❌ 현재 비밀번호 확인 실패:', verifyError)
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '현재 비밀번호가 올바르지 않습니다.'
        },
        { status: 400 }
      )
    }

    console.log('✅ 현재 비밀번호 확인 완료')

    // 비밀번호 변경
    const { error: updateError } = await supabase.auth.updateUser({
      password: trimmedNewPassword
    })

    if (updateError) {
      console.error('❌ 비밀번호 변경 오류:', updateError)
      
      let errorMessage = '비밀번호 변경에 실패했습니다.'
      if (updateError.message?.includes('Password should be at least')) {
        errorMessage = '비밀번호는 최소 6자 이상이어야 합니다.'
      } else if (updateError.message?.includes('same as')) {
        errorMessage = '새 비밀번호는 현재 비밀번호와 달라야 합니다.'
      }
      
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: errorMessage
        },
        { status: 400 }
      )
    }

    console.log('✅ 비밀번호 변경 완료')

    return NextResponse.json<AuthResponse>(
      {
        success: true,
        data: {
          id: session.user.id,
          email: session.user.email!,
          role: session.user.user_metadata?.role || 'user',
          created_at: session.user.created_at,
          last_sign_in_at: session.user.last_sign_in_at,
          email_confirmed_at: session.user.email_confirmed_at,
          updated_at: session.user.updated_at
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ 패스워드 변경 중 예외 발생:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        error: `비밀번호 변경 중 오류가 발생했습니다: ${errorMessage}`
      },
      { status: 500 }
    )
  }
}
