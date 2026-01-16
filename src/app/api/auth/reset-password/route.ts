import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 비밀번호 재설정 요청 API 호출 시작')
    
    let body: { email: string }
    try {
      body = await request.json()
      console.log('📝 요청 데이터 파싱 성공:', { email: body.email })
    } catch (parseError) {
      console.error('❌ JSON 파싱 오류:', parseError)
      return NextResponse.json(
        {
          success: false,
          error: '잘못된 요청 형식입니다.'
        },
        { status: 400 }
      )
    }
    
    // ✅ 이메일 앞뒤 공백 제거
    const trimmedEmail = body.email?.trim()
    
    if (!trimmedEmail) {
      console.log('❌ 이메일 필드 누락')
      return NextResponse.json(
        {
          success: false,
          error: '이메일을 입력해주세요.'
        },
        { status: 400 }
      )
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: '올바른 이메일 형식을 입력해주세요.'
        },
        { status: 400 }
      )
    }

    console.log('🔗 Supabase 클라이언트 생성 중...')
    
    const supabase = createClient()

    // 비밀번호 재설정 이메일 전송
    // redirectTo는 Supabase Dashboard의 Site URL 설정을 사용하므로
    // 환경 변수나 요청 origin을 사용하여 올바른 URL 설정
    const origin = request.headers.get('origin') || request.headers.get('referer')?.split('/').slice(0, 3).join('/')
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin || 'http://localhost:3000'
    const redirectTo = `${siteUrl}/auth/reset-password`
    
    console.log('🔗 리다이렉트 URL 설정:', { 
      redirectTo,
      origin,
      siteUrl,
      envSiteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      host: request.headers.get('host')
    })
    
    // redirectTo와 emailRedirectTo 모두 설정
    // Supabase Dashboard의 Site URL이 올바르게 설정되어 있어야 함
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: redirectTo,
      emailRedirectTo: redirectTo
    })

    if (resetError) {
      console.error('❌ 비밀번호 재설정 이메일 전송 오류:', resetError)
      
      // 보안상 이유로 사용자에게는 항상 성공 메시지를 표시
      // (존재하지 않는 이메일인지 확인할 수 없도록)
      return NextResponse.json(
        {
          success: true,
          message: '비밀번호 재설정 링크가 전송되었습니다. 이메일을 확인해주세요.'
        },
        { status: 200 }
      )
    }

    console.log('✅ 비밀번호 재설정 이메일 전송 완료:', { email: trimmedEmail })

    return NextResponse.json(
      {
        success: true,
        message: '비밀번호 재설정 링크가 전송되었습니다. 이메일을 확인해주세요.'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ 비밀번호 재설정 요청 중 예외 발생:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    
    // 보안상 이유로 사용자에게는 항상 성공 메시지를 표시
    return NextResponse.json(
      {
        success: true,
        message: '비밀번호 재설정 링크가 전송되었습니다. 이메일을 확인해주세요.'
      },
      { status: 200 }
    )
  }
}
