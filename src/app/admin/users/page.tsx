'use client'

import React, { useState, useEffect } from 'react'
import { Users, Plus, Edit, Trash2, Shield, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User as UserType } from '@/types/auth'
import { cn } from '@/lib/utils'
import { AuthGuard } from '@/components/shared/auth-guard'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // 사용자 목록 조회
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users/list')
      const result = await response.json()

      if (result.success) {
        setUsers(result.data || [])
      } else {
        setError(result.error || '사용자 목록을 가져오는데 실패했습니다.')
      }
    } catch {
      setError('사용자 목록을 가져오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 사용자 생성
  const createUser = async (userData: { email: string; password: string; role: 'admin' | 'user' }) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      const result = await response.json()

      if (result.success) {
        await fetchUsers()
        setShowCreateForm(false)
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch {
      return { success: false, error: '사용자 생성 중 오류가 발생했습니다.' }
    }
  }

  // 사용자 수정
  const updateUser = async (userData: { id: string; email?: string; role?: 'admin' | 'user'; password?: string }) => {
    try {
      const response = await fetch('/api/users/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      const result = await response.json()

      if (result.success) {
        await fetchUsers()
        setEditingUser(null)
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch {
      return { success: false, error: '사용자 수정 중 오류가 발생했습니다.' }
    }
  }

  // 사용자 삭제
  const deleteUser = async (userId: string) => {
    if (!confirm('정말로 이 사용자를 삭제하시겠습니까?')) return

    try {
      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId })
      })

      const result = await response.json()

      if (result.success) {
        await fetchUsers()
      } else {
        alert(result.error || '사용자 삭제에 실패했습니다.')
      }
    } catch {
      alert('사용자 삭제 중 오류가 발생했습니다.')
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // 검색 필터링
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">사용자 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard requiredRole="admin">
        <div className="min-h-[60vh]">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">관리자 관리</h1>
            <p className="text-sm text-gray-600 mt-1">시스템 사용자 계정을 관리하세요</p>
          </div>
        </div>

              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          {/* 오류 메시지 표시 */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="이메일 또는 역할로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="h-10 px-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            새 사용자
          </Button>
        </div>



        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium">이메일</th>
                <th className="h-12 px-4 text-left align-middle font-medium">역할</th>
                <th className="h-12 px-4 text-left align-middle font-medium">가입일</th>
                <th className="h-12 px-4 text-left align-middle font-medium">마지막 로그인</th>
                <th className="h-12 px-4 text-left align-middle font-medium">작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="p-4 align-middle">
                    <div className="font-medium">{user.email}</div>
                    <div className="text-sm text-gray-500">ID: {user.id}</div>
                  </td>
                  <td className="p-4 align-middle">
                    <div className="flex items-center gap-2">
                      {user.role === 'admin' ? (
                        <Shield className="h-4 w-4 text-red-600" />
                      ) : (
                        <User className="h-4 w-4 text-blue-600" />
                      )}
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        user.role === 'admin' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      )}>
                        {user.role === 'admin' ? '관리자' : '사용자'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 align-middle text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="p-4 align-middle text-sm text-gray-600">
                    {user.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleDateString('ko-KR')
                      : '로그인 기록 없음'
                    }
                  </td>
                  <td className="p-4 align-middle">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteUser(user.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 사용자가 없습니다.'}
          </div>
        )}
      </div>

      {/* 사용자 생성/수정 모달 */}
      {(showCreateForm || editingUser) && (
        <UserFormModal
          user={editingUser}
          onSubmit={async (data: { id?: string; email: string; password: string; role: 'admin' | 'user' } | { id: string; email?: string; role?: 'admin' | 'user'; password?: string }) => {
            if (editingUser) {
              return await updateUser(data as { id: string; email?: string; role?: 'admin' | 'user'; password?: string })
            } else {
              return await createUser(data as { email: string; password: string; role: 'admin' | 'user' })
            }
          }}
          onClose={() => {
            setShowCreateForm(false)
            setEditingUser(null)
          }}
        />
      )}
        </div>
    </AuthGuard>
  )
}

// 사용자 생성/수정 모달 컴포넌트
function UserFormModal({ 
  user, 
  onSubmit, 
  onClose 
}: { 
  user: UserType | null
  onSubmit: (data: { id?: string; email: string; password: string; role: 'admin' | 'user' } | { id: string; email?: string; role?: 'admin' | 'user'; password?: string }) => Promise<{ success: boolean; error?: string }>
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    role: user?.role || 'user' as 'admin' | 'user'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 새 사용자 생성 시에만 비밀번호 확인
    if (!user && formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    // 새 사용자 생성 시 비밀번호 길이 확인
    if (!user && formData.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      setLoading(false)
      return
    }

    try {
      const data = user 
        ? { id: user.id, ...formData }
        : { email: formData.email, password: formData.password, role: formData.role }

      const result = await onSubmit(data)
      
      if (result.success) {
        onClose()
      } else {
        setError(result.error || '작업에 실패했습니다.')
      }
    } catch {
      setError('작업 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">
          {user ? '사용자 수정' : '새 사용자 생성'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={!!user} // 수정 시 이메일 변경 불가
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!user} // 수정 시 선택사항
              placeholder={user ? '변경하지 않으려면 비워두세요' : '••••••••'}
            />
            {!user && (
              <p className="text-xs text-gray-500 mt-1">최소 6자 이상</p>
            )}
          </div>

          {!user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호 확인
              </label>
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required={!user}
                placeholder="••••••••"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              역할
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">사용자</option>
              <option value="admin">관리자</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? '처리 중...' : (user ? '수정' : '생성')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              취소
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
