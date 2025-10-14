import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * 모든 사용자의 이메일을 확인 처리
 * POST /api/users/confirm-all-emails
 */
export async function POST() {
  try {
    const supabase = createServiceRoleClient()

    console.log('📧 모든 사용자 이메일 일괄 확인 처리 시작...')

    // 모든 사용자 가져오기
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('❌ 사용자 목록 조회 실패:', listError)
      return NextResponse.json({
        success: false,
        error: '사용자 목록을 가져오는데 실패했습니다.'
      }, { status: 500 })
    }

    console.log(`📋 총 ${users.users.length}명의 사용자 발견`)

    let successCount = 0
    let alreadyConfirmedCount = 0
    let errorCount = 0
    const errors: Array<{ email: string; error: string }> = []

    // 각 사용자의 이메일 확인 처리
    for (const user of users.users) {
      try {
        // 이미 확인된 사용자는 건너뛰기
        if (user.email_confirmed_at) {
          alreadyConfirmedCount++
          console.log(`✓ 이미 확인됨: ${user.email}`)
          continue
        }

        console.log(`📧 확인 처리 중: ${user.email}`)

        const { error } = await supabase.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        )

        if (error) {
          errorCount++
          errors.push({ email: user.email || 'unknown', error: error.message })
          console.error(`❌ 실패: ${user.email}`, error)
        } else {
          successCount++
          console.log(`✅ 성공: ${user.email}`)
        }
      } catch (e) {
        errorCount++
        const errorMessage = e instanceof Error ? e.message : '알 수 없는 오류'
        errors.push({ email: user.email || 'unknown', error: errorMessage })
        console.error(`❌ 예외: ${user.email}`, e)
      }
    }

    console.log('📊 이메일 확인 처리 완료:', {
      total: users.users.length,
      alreadyConfirmed: alreadyConfirmedCount,
      newlyConfirmed: successCount,
      errors: errorCount
    })

    return NextResponse.json({
      success: true,
      data: {
        total: users.users.length,
        alreadyConfirmed: alreadyConfirmedCount,
        newlyConfirmed: successCount,
        errors: errorCount,
        errorDetails: errors
      }
    })

  } catch (error) {
    console.error('❌ 일괄 이메일 확인 처리 중 오류:', error)
    return NextResponse.json({
      success: false,
      error: '일괄 이메일 확인 처리 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

