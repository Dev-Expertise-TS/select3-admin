import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { LoginCredentials, AuthResponse } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 로그인 API 호출 시작')
    
    let body: LoginCredentials
    try {
      body = await request.json()
      console.log('📝 요청 데이터 파싱 성공:', { email: body.email, hasPassword: !!body.password })
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
    
    // ✅ 이메일과 패스워드 앞뒤 공백 제거
    const trimmedEmail = body.email?.trim()
    const trimmedPassword = body.password?.trim()
    
    if (!trimmedEmail || !trimmedPassword) {
      console.log('❌ 필수 필드 누락 (trim 후):', { 
        hasEmail: !!trimmedEmail, 
        hasPassword: !!trimmedPassword,
        originalEmail: body.email,
        originalPassword: body.password ? '***' : null
      })
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '이메일과 비밀번호를 입력해주세요.'
        },
        { status: 400 }
      )
    }

    console.log('🔗 Supabase 클라이언트 생성 중...')
    
    // 환경 변수 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Supabase 환경 변수 누락:', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      })
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '서버 설정 오류가 발생했습니다.'
        },
        { status: 500 }
      )
    }
    
    const supabase = createServiceRoleClient()
    console.log('✅ Supabase 클라이언트 생성 완료')
    
    // 사용자 인증
    console.log('🔐 사용자 인증 시도 중...')
    console.log('📧 인증 시도 이메일:', trimmedEmail)
    console.log('🔑 패스워드 길이:', trimmedPassword.length)
    console.log('🔑 패스워드 첫 3자:', trimmedPassword.substring(0, 3) + '***')
    
    // ✅ 먼저 사용자가 존재하는지 확인
    try {
      const { data: users, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) {
        console.error('❌ 사용자 목록 조회 오류:', listError)
      } else {
        const userExists = users.users.find(u => u.email === trimmedEmail)
        if (userExists) {
          console.log('✅ 사용자 존재 확인:', {
            id: userExists.id,
            email: userExists.email,
            confirmed: userExists.email_confirmed_at ? '인증됨' : '미인증',
            lastSignIn: userExists.last_sign_in_at
          })
        } else {
          console.log('❌ 해당 이메일의 사용자가 존재하지 않음')
        }
      }
    } catch (e) {
      console.warn('사용자 확인 중 오류 (계속 진행):', e)
    }
    
    type SignInResult = Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>
    let authData: SignInResult['data'] | null = null
    let authError: SignInResult['error'] | null = null
    
    try {
      console.log('🔐 signInWithPassword 호출 시작...')
      
      const result = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword
      })
      
      authData = result.data
      authError = result.error

      console.log('🔐 signInWithPassword 호출 완료:', {
        hasData: !!authData,
        hasUser: !!authData?.user,
        hasError: !!authError,
        errorMessage: authError?.message
      })

      if (authError) {
        console.error('❌ Supabase 인증 오류 상세:', {
          message: authError.message,
          status: authError.status,
          name: authError.name
        })
        
        // 더 구체적인 오류 메시지 제공
        let errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
        let errorCode = 'INVALID_CREDENTIALS'
        
        if (authError.message?.includes('Invalid login credentials')) {
          // 이메일은 존재하지만 비밀번호가 틀린 경우
          errorMessage = '비밀번호가 올바르지 않습니다. 다시 확인해주세요.'
          errorCode = 'INVALID_PASSWORD'
        } else if (authError.message?.includes('Email not confirmed')) {
          errorMessage = '이메일 인증이 완료되지 않았습니다.'
          errorCode = 'EMAIL_NOT_CONFIRMED'
        } else if (authError.message?.includes('Too many requests')) {
          errorMessage = '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.'
          errorCode = 'TOO_MANY_REQUESTS'
        } else if (authError.message?.includes('User not found')) {
          errorMessage = '등록되지 않은 이메일 주소입니다.'
          errorCode = 'USER_NOT_FOUND'
        }
        
        return NextResponse.json<AuthResponse>(
          {
            success: false,
            error: errorMessage,
            code: errorCode
          },
          { status: 401 }
        )
      }
      
      console.log('✅ Supabase 인증 성공:', { 
        userId: authData.user?.id,
        email: authData.user?.email
      })
    } catch (authError) {
      console.error('❌ Supabase 인증 예외 발생:', authError)
      console.error('❌ 예외 상세:', JSON.stringify(authError, null, 2))
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '인증 서비스에 일시적인 문제가 발생했습니다.'
        },
        { status: 500 }
      )
    }

    if (!authData || !authData.user) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: '사용자 정보를 찾을 수 없습니다.'
        },
        { status: 404 }
      )
    }

    // 사용자 메타데이터에서 역할 확인
    const userRole = authData.user.user_metadata?.role || 'user'
    
    const authUser: AuthResponse['data'] = {
      id: authData.user.id,
      email: authData.user.email!,
      role: userRole,
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
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ 로그인 API 오류:', error)
    
    // 더 자세한 오류 정보 로깅
    if (error instanceof Error) {
      console.error('❌ 오류 메시지:', error.message)
      console.error('❌ 오류 스택:', error.stack)
    }
    
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      },
      { status: 500 }
    )
  }
}
