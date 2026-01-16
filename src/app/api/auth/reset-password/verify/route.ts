import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 비밀번호 재설정 코드 검증 API 호출 시작')
    
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    console.log('📝 요청 파라미터:', { 
      hasCode: !!code, 
      code: code?.substring(0, 10) + '...',
      hasTokenHash: !!tokenHash,
      tokenHash: tokenHash?.substring(0, 10) + '...',
      type 
    })

    // 쿠키를 포함한 클라이언트 생성
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // token_hash가 있으면 verifyOtp 사용 (비밀번호 재설정 권장 방식)
    if (tokenHash && type === 'recovery') {
      console.log('🔐 verifyOtp로 토큰 검증 시작...')
      
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        type: 'recovery',
        token_hash: tokenHash
      })

      if (verifyError) {
        console.error('❌ OTP 검증 오류:', {
          message: verifyError.message,
          status: verifyError.status,
          name: verifyError.name
        })
        
        let errorMessage = '비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다.'
        if (verifyError.message?.includes('expired')) {
          errorMessage = '비밀번호 재설정 링크가 만료되었습니다. 다시 요청해주세요.'
        } else if (verifyError.message?.includes('invalid')) {
          errorMessage = '비밀번호 재설정 링크가 유효하지 않습니다. 다시 요청해주세요.'
        }
        
        return NextResponse.json(
          {
            success: false,
            error: errorMessage
          },
          { status: 400 }
        )
      }

      console.log('✅ OTP 검증 성공:', { 
        userId: data.user?.id, 
        email: data.user?.email,
        hasSession: !!data.session
      })

      // 세션이 생성되었으므로 쿠키에 저장됨
      return NextResponse.redirect(new URL('/auth/reset-password?verified=true', request.url))
    }

    // code만 있는 경우 - Supabase가 자동으로 세션을 생성했을 수 있음
    // 먼저 세션을 확인하고, 없으면 에러
    if (code) {
      console.log('⚠️ code 파라미터만 있음. 세션 확인 중...')
      
      // Supabase의 resetPasswordForEmail은 링크 클릭 시 자동으로 세션을 생성할 수 있음
      // 먼저 현재 세션 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('❌ 세션 확인 오류:', sessionError)
      }
      
      if (session) {
        console.log('✅ 세션이 이미 존재함:', { 
          userId: session.user?.id, 
          email: session.user?.email
        })
        return NextResponse.redirect(new URL('/auth/reset-password?verified=true', request.url))
      }
      
      // 세션이 없으면 PKCE 없이 교환 시도 (실패할 가능성 높음)
      console.log('⚠️ 세션이 없음. PKCE 없이 코드 교환 시도 (실패 가능)...')
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('❌ 코드 교환 오류 (PKCE 필요):', {
          message: exchangeError.message,
          status: exchangeError.status,
          name: exchangeError.name
        })
        
        // PKCE 오류인 경우 명확한 안내 메시지
        if (exchangeError.message?.includes('code verifier')) {
          return NextResponse.json(
            {
              success: false,
              error: '비밀번호 재설정 링크를 다른 브라우저나 디바이스에서 열었습니다. 같은 브라우저에서 링크를 다시 요청하거나, 이메일 템플릿을 token_hash 방식으로 변경해주세요.'
            },
            { status: 400 }
          )
        }
        
        let errorMessage = '비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다.'
        if (exchangeError.message?.includes('expired')) {
          errorMessage = '비밀번호 재설정 링크가 만료되었습니다. 다시 요청해주세요.'
        } else if (exchangeError.message?.includes('invalid')) {
          errorMessage = '비밀번호 재설정 링크가 유효하지 않습니다. 다시 요청해주세요.'
        }
        
        return NextResponse.json(
          {
            success: false,
            error: errorMessage
          },
          { status: 400 }
        )
      }

      console.log('✅ 코드 교환 성공:', { 
        userId: data.user?.id, 
        email: data.user?.email,
        hasSession: !!data.session
      })

      return NextResponse.redirect(new URL('/auth/reset-password?verified=true', request.url))
    }

    // code도 token_hash도 없는 경우
    return NextResponse.json(
      {
        success: false,
        error: '비밀번호 재설정 링크가 올바르지 않습니다.'
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('❌ 코드 검증 중 예외 발생:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return NextResponse.json(
      {
        success: false,
        error: `비밀번호 재설정 링크 처리 중 오류가 발생했습니다: ${errorMessage}`
      },
      { status: 500 }
    )
  }
}
