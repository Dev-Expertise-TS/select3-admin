'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * 사용자 업데이트
 */
export async function updateUser(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const userId = formData.get('id') as string
    const emailRaw = formData.get('email') as string
    const role = formData.get('role') as string
    const passwordRaw = formData.get('password') as string

    // ✅ 공백 제거
    const email = emailRaw?.trim()
    const password = passwordRaw?.trim()

    console.log('👤 사용자 업데이트 요청:', {
      userId,
      email,
      role,
      hasPassword: !!password,
      passwordLength: password?.length || 0
    })

    if (!userId) {
      return {
        success: false,
        error: '사용자 ID는 필수입니다.',
      }
    }

    // ✅ 한 번의 updateUserById 호출로 모든 필드 업데이트
    const updatePayload: {
      email?: string
      password?: string
      email_confirm?: boolean
      user_metadata?: { role?: string }
    } = {}

    if (email) {
      updatePayload.email = email
      // ✅ 이메일 변경 시 자동으로 확인 처리
      updatePayload.email_confirm = true
      console.log('📧 이메일 변경 및 자동 확인 처리')
    }

    if (password && password.length >= 6) {
      updatePayload.password = password
      // ✅ 비밀번호 변경 시에도 이메일 확인 처리 (미인증 상태 해결)
      updatePayload.email_confirm = true
      console.log('🔑 비밀번호 변경 요청 (길이:', password.length, ') + 이메일 자동 확인')
    } else if (password && password.length < 6) {
      return {
        success: false,
        error: '비밀번호는 최소 6자 이상이어야 합니다.',
      }
    }

    if (role) {
      updatePayload.user_metadata = { role }
    }

    // ✅ 비밀번호 변경 없이 role만 변경하는 경우에도 이메일 확인 처리
    if (!password && !email && updatePayload.user_metadata) {
      updatePayload.email_confirm = true
      console.log('👤 역할 변경 + 이메일 자동 확인')
    }

    console.log('📦 업데이트 페이로드:', {
      hasEmail: !!updatePayload.email,
      hasPassword: !!updatePayload.password,
      hasRole: !!updatePayload.user_metadata,
      emailConfirm: updatePayload.email_confirm
    })

    // ✅ 한 번에 모든 업데이트 실행
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      updatePayload
    )

    if (error) {
      console.error('❌ 사용자 업데이트 오류:', error)
      return {
        success: false,
        error: `사용자 업데이트에 실패했습니다: ${error.message}`,
      }
    }

    console.log('✅ 사용자 업데이트 성공:', {
      userId,
      updatedEmail: data.user?.email,
      updatedRole: data.user?.user_metadata?.role,
      passwordUpdated: !!password
    })

    revalidatePath('/admin/users')

    return {
      success: true,
    }
  } catch (error) {
    console.error('❌ 사용자 업데이트 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

/**
 * 사용자 삭제
 */
export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) {
      console.error('사용자 삭제 오류:', error)
      return {
        success: false,
        error: `사용자 삭제에 실패했습니다: ${error.message}`,
      }
    }

    revalidatePath('/admin/users')

    return {
      success: true,
    }
  } catch (error) {
    console.error('사용자 삭제 중 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }
  }
}

