'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { User } from '@/types/auth'

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
  meta?: Record<string, unknown>
}

/**
 * 사용자 목록 조회
 */
export async function getUsers(): Promise<ActionResult<User[]>> {
  try {
    const supabase = createServiceRoleClient()
    
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('인증 사용자 조회 오류:', authError)
      return { success: false, error: '사용자 목록을 가져오는데 실패했습니다.' }
    }

    const users = authUsers.users.map(authUser => ({
      id: authUser.id,
      email: authUser.email!,
      role: authUser.user_metadata?.role || 'user',
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at,
      email_confirmed_at: authUser.email_confirmed_at,
      updated_at: authUser.updated_at
    }))

    return {
      success: true,
      data: users,
      meta: { count: users.length }
    }
  } catch (err) {
    console.error('사용자 목록 조회 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 사용자 정보 수정
 */
export async function updateUser(formData: FormData): Promise<ActionResult<User>> {
  try {
    const id = formData.get('id') as string
    const role = formData.get('role') as string
    const password = formData.get('password') as string

    if (!id) {
      return { success: false, error: '사용자 ID가 필요합니다.' }
    }

    const supabase = createServiceRoleClient()
    
    // 역할 업데이트
    if (role) {
      const { error: metadataError } = await supabase.auth.admin.updateUserById(
        id,
        { user_metadata: { role } }
      )

      if (metadataError) {
        console.error('사용자 메타데이터 업데이트 오류:', metadataError)
        return { success: false, error: '사용자 역할 업데이트에 실패했습니다.' }
      }
    }

    // 비밀번호 변경
    if (password && password.trim()) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        id,
        { password: password.trim() }
      )

      if (passwordError) {
        console.error('비밀번호 변경 오류:', passwordError)
        return { success: false, error: '비밀번호 변경에 실패했습니다.' }
      }
    }

    // 업데이트된 사용자 정보 조회
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(id)
    
    if (authError) {
      console.error('인증 사용자 조회 오류:', authError)
      return { success: false, error: '업데이트된 사용자 정보를 가져오는데 실패했습니다.' }
    }

    const updatedUser = {
      id: authData.user!.id,
      email: authData.user!.email!,
      role: authData.user!.user_metadata?.role || 'user',
      created_at: authData.user!.created_at,
      last_sign_in_at: authData.user!.last_sign_in_at,
      email_confirmed_at: authData.user!.email_confirmed_at,
      updated_at: authData.user!.updated_at
    }

    revalidatePath('/admin/users')
    return { success: true, data: updatedUser }
  } catch (err) {
    console.error('사용자 업데이트 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 사용자 삭제
 */
export async function deleteUser(id: string): Promise<ActionResult> {
  try {
    if (!id) {
      return { success: false, error: '사용자 ID가 필요합니다.' }
    }

    const supabase = createServiceRoleClient()
    
    const { error: authError } = await supabase.auth.admin.deleteUser(id)

    if (authError) {
      console.error('인증 계정 삭제 오류:', authError)
      return { success: false, error: '사용자 인증 계정 삭제에 실패했습니다.' }
    }

    revalidatePath('/admin/users')
    return { success: true }
  } catch (err) {
    console.error('사용자 삭제 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 이메일 확인 처리
 */
export async function confirmUserEmail(id: string): Promise<ActionResult> {
  try {
    if (!id) {
      return { success: false, error: '사용자 ID가 필요합니다.' }
    }

    const supabase = createServiceRoleClient()
    
    const { error } = await supabase.auth.admin.updateUserById(
      id,
      { email_confirm: true }
    )

    if (error) {
      console.error('이메일 확인 처리 오류:', error)
      return { success: false, error: '이메일 확인 처리에 실패했습니다.' }
    }

    revalidatePath('/admin/users')
    return { success: true }
  } catch (err) {
    console.error('이메일 확인 처리 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}

/**
 * 모든 사용자 이메일 확인 처리
 */
export async function confirmAllUserEmails(): Promise<ActionResult> {
  try {
    const supabase = createServiceRoleClient()
    
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('사용자 목록 조회 오류:', listError)
      return { success: false, error: '사용자 목록을 가져오는데 실패했습니다.' }
    }

    let successCount = 0
    let failCount = 0

    for (const user of authUsers.users) {
      if (!user.email_confirmed_at) {
        const { error } = await supabase.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        )

        if (error) {
          failCount++
          console.error(`사용자 ${user.email} 이메일 확인 실패:`, error)
        } else {
          successCount++
        }
      }
    }

    revalidatePath('/admin/users')
    return {
      success: true,
      meta: { successCount, failCount, total: authUsers.users.length }
    }
  } catch (err) {
    console.error('모든 이메일 확인 처리 중 오류:', err)
    return { success: false, error: '서버 오류가 발생했습니다.' }
  }
}
