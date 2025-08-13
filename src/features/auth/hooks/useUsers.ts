import { useState, useCallback } from 'react'
import { User, UserUpdateRequest } from '@/types/auth'

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 사용자 목록 조회
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/users/list')
      const result = await response.json()

      if (result.success) {
        setUsers(result.data || [])
      } else {
        setError(result.error || '사용자 목록을 가져오는데 실패했습니다.')
      }
    } catch (error) {
      setError('사용자 목록을 가져오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  // 사용자 생성
  const createUser = useCallback(async (userData: { email: string; password: string; role: 'admin' | 'user' }) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      const result = await response.json()

      if (result.success) {
        await fetchUsers()
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return { success: false, error: '사용자 생성 중 오류가 발생했습니다.' }
    }
  }, [fetchUsers])

  // 사용자 수정
  const updateUser = useCallback(async (userData: UserUpdateRequest) => {
    try {
      const response = await fetch('/api/users/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      const result = await response.json()

      if (result.success) {
        await fetchUsers()
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return { success: false, error: '사용자 수정 중 오류가 발생했습니다.' }
    }
  }, [fetchUsers])

  // 사용자 삭제
  const deleteUser = useCallback(async (userId: string) => {
    try {
      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId })
      })

      const result = await response.json()

      if (result.success) {
        await fetchUsers()
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return { success: false, error: '사용자 삭제 중 오류가 발생했습니다.' }
    }
  }, [fetchUsers])

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  }
}
