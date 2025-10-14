import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * 사용자 이메일 확인 처리
 * POST /api/users/confirm-email
 * Body: { userId } 또는 { email }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userId = body.userId
    const email = body.email?.trim()

    if (!userId && !email) {
      return NextResponse.json({
        success: false,
        error: 'userId 또는 email이 필요합니다.'
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    let targetUserId = userId

    // 이메일로 사용자 찾기
    if (!targetUserId && email) {
      const { data: users } = await supabase.auth.admin.listUsers()
      const user = users.users.find(u => u.email === email)
      
      if (!user) {
        return NextResponse.json({
          success: false,
          error: '해당 이메일의 사용자를 찾을 수 없습니다.'
        }, { status: 404 })
      }
      
      targetUserId = user.id
      console.log('✅ 이메일로 사용자 찾음:', { userId: targetUserId, email })
    }

    console.log('📧 이메일 확인 처리 시작:', { userId: targetUserId, email })

    // 이메일 확인 처리
    const { data, error } = await supabase.auth.admin.updateUserById(
      targetUserId,
      { email_confirm: true }
    )

    if (error) {
      console.error('❌ 이메일 확인 처리 실패:', error)
      return NextResponse.json({
        success: false,
        error: `이메일 확인 처리에 실패했습니다: ${error.message}`
      }, { status: 500 })
    }

    console.log('✅ 이메일 확인 처리 성공:', {
      userId: data.user.id,
      email: data.user.email,
      confirmed: !!data.user.email_confirmed_at
    })

    return NextResponse.json({
      success: true,
      data: {
        userId: data.user.id,
        email: data.user.email,
        confirmed: !!data.user.email_confirmed_at
      }
    })

  } catch (error) {
    console.error('❌ 이메일 확인 처리 중 오류:', error)
    return NextResponse.json({
      success: false,
      error: '이메일 확인 처리 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

