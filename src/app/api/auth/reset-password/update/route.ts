import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 비밀번호 재설정 업데이트 API 호출 시작')
    
    let body: { password: string }
    try {
      body = await request.json()
      console.log('📝 요청 데이터 파싱 성공:', { hasPassword: !!body.password })
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
    
    // ✅ 패스워드 앞뒤 공백 제거
    const trimmedPassword = body.password?.trim()
    
    if (!trimmedPassword) {
      console.log('❌ 비밀번호 필드 누락')
      return NextResponse.json(
        {
          success: false,
          error: '비밀번호를 입력해주세요.'
        },
        { status: 400 }
      )
    }

    // 비밀번호 유효성 검사
    if (trimmedPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: '비밀번호는 최소 6자 이상이어야 합니다.'
        },
        { status: 400 }
      )
    }

    console.log('🔗 Supabase 클라이언트 생성 중...')
    
    // 쿠키를 포함한 클라이언트 생성 (세션 정보가 쿠키에 저장되어 있음)
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // 현재 세션 확인 (비밀번호 재설정 링크를 통해 접근한 경우 세션이 있어야 함)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ 세션 확인 오류:', sessionError)
      return NextResponse.json(
        {
          success: false,
          error: '비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다. 다시 요청해주세요.'
        },
        { status: 401 }
      )
    }

    if (!session) {
      console.error('❌ 세션이 없습니다')
      return NextResponse.json(
        {
          success: false,
          error: '비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다. 다시 요청해주세요.'
        },
        { status: 401 }
      )
    }

    console.log('✅ 세션 확인 완료:', { userId: session.user.id, email: session.user.email })

    // 비밀번호 변경
    const { error: updateError } = await supabase.auth.updateUser({
      password: trimmedPassword
    })

    if (updateError) {
      console.error('❌ 비밀번호 변경 오류:', updateError)
      
      let errorMessage = '비밀번호 변경에 실패했습니다.'
      if (updateError.message?.includes('Password should be at least')) {
        errorMessage = '비밀번호는 최소 6자 이상이어야 합니다.'
      }
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage
        },
        { status: 400 }
      )
    }

    console.log('✅ 비밀번호 변경 완료')

    return NextResponse.json(
      {
        success: true,
        message: '비밀번호가 성공적으로 변경되었습니다.'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ 비밀번호 재설정 업데이트 중 예외 발생:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return NextResponse.json(
      {
        success: false,
        error: `비밀번호 변경 중 오류가 발생했습니다: ${errorMessage}`
      },
      { status: 500 }
    )
  }
}
