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
    const email = formData.get('email') as string
    const role = formData.get('role') as string
    const password = formData.get('password') as string

    if (!userId) {
      return {
        success: false,
        error: '사용자 ID는 필수입니다.',
      }
    }

    const updateData: Record<string, unknown> = {}

    if (email) updateData.email = email
    if (role) updateData.role = role

    // 비밀번호가 제공된 경우에만 업데이트
    if (password && password.length >= 6) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        userId,
        { password }
      )

      if (passwordError) {
        console.error('비밀번호 업데이트 오류:', passwordError)
        return {
          success: false,
          error: `비밀번호 업데이트에 실패했습니다: ${passwordError.message}`,
        }
      }
    }

    // 사용자 메타데이터 업데이트 (role, email)
    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase.auth.admin.updateUserById(
        userId,
        {
          email: email || undefined,
          user_metadata: { role: role || undefined },
        }
      )

      if (error) {
        console.error('사용자 업데이트 오류:', error)
        return {
          success: false,
          error: `사용자 업데이트에 실패했습니다: ${error.message}`,
        }
      }
    }

    revalidatePath('/admin/users')

    return {
      success: true,
    }
  } catch (error) {
    console.error('사용자 업데이트 중 오류:', error)
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

