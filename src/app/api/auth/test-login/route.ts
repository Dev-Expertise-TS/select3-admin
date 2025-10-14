import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 테스트용 로그인 API - 비밀번호 변경 후 로그인 테스트
 * POST /api/auth/test-login
 * Body: { email, password }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = body.email?.trim()
    const password = body.password?.trim()

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: '이메일과 비밀번호가 필요합니다.'
      })
    }

    console.log('🧪 테스트 로그인 시도:', {
      email,
      passwordLength: password.length,
      passwordFirstChars: password.substring(0, 3) + '***'
    })

    // ✅ 일반 클라이언트 사용 (Anon Key)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('❌ 테스트 로그인 실패:', {
        message: error.message,
        status: error.status
      })
      
      return NextResponse.json({
        success: false,
        error: error.message,
        details: {
          errorType: error.name,
          errorStatus: error.status
        }
      })
    }

    console.log('✅ 테스트 로그인 성공:', {
      userId: data.user?.id,
      email: data.user?.email,
      hasSession: !!data.session
    })

    return NextResponse.json({
      success: true,
      data: {
        userId: data.user?.id,
        email: data.user?.email,
        role: data.user?.user_metadata?.role,
        hasSession: !!data.session
      }
    })
  } catch (error) {
    console.error('❌ 테스트 로그인 예외:', error)
    return NextResponse.json({
      success: false,
      error: '테스트 로그인 중 오류가 발생했습니다.'
    })
  }
}

