'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { Users, Plus, Edit, Trash2, Shield, User, History, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User as UserType } from '@/types/auth'
import { cn } from '@/lib/utils'
import { AuthGuard } from '@/components/shared/auth-guard'
import { updateUser, deleteUser as deleteUserAction } from '@/features/users/actions'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [historyUser, setHistoryUser] = useState<UserType | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; action: string; created_at: string }>>([])
  const [_isPending, startTransition] = useTransition()
  
  const handleViewHistory = async (user: UserType) => {
    setHistoryUser(user)
    setHistoryError('')
    setHistoryItems([])
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.id)}/activity`, { cache: 'no-store' })
      const json = await res.json()
      if (json?.success) {
        const list = Array.isArray(json.data) ? json.data : []
        setHistoryItems(
          list.map((r: { id?: string; action?: string; created_at?: string }) => ({
            id: String(r?.id ?? ''),
            action: String(r?.action ?? ''),
            created_at: String(r?.created_at ?? ''),
          }))
        )
      } else {
        setHistoryError(String(json?.error || '활동 이력을 불러오지 못했습니다.'))
      }
    } catch {
      setHistoryError('활동 이력을 불러오지 못했습니다.')
    } finally {
      setHistoryLoading(false)
    }
  }

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
  const updateUserLocal = async (userData: { id: string; email?: string; role?: 'admin' | 'user'; password?: string }) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      startTransition(async () => {
        try {
          // ✅ 공백 제거
          const trimmedEmail = userData.email?.trim()
          const trimmedPassword = userData.password?.trim()
          
          console.log('👤 사용자 업데이트 로컬:', {
            userId: userData.id,
            email: trimmedEmail,
            role: userData.role,
            hasPassword: !!trimmedPassword,
            passwordLength: trimmedPassword?.length || 0
          })
          
          const formData = new FormData()
          formData.append('id', userData.id)
          if (trimmedEmail) formData.append('email', trimmedEmail)
          if (userData.role) formData.append('role', userData.role)
          if (trimmedPassword) formData.append('password', trimmedPassword)

          const result = await updateUser(formData)

          if (result.success) {
            console.log('✅ 사용자 업데이트 성공 완료')
            
            // ✅ 비밀번호 변경 시 명확한 알림
            if (trimmedPassword) {
              alert(`✅ 비밀번호가 성공적으로 변경되었습니다.\n\n새 비밀번호로 로그인하세요:\n이메일: ${trimmedEmail}\n비밀번호: ${trimmedPassword}\n\n(이 메시지는 테스트용입니다)`)
            }
            
            await fetchUsers()
            setEditingUser(null)
            resolve({ success: true })
          } else {
            console.error('❌ 사용자 업데이트 실패:', result.error)
            resolve({ success: false, error: result.error })
          }
        } catch {
          resolve({ success: false, error: '사용자 수정 중 오류가 발생했습니다.' })
        }
      })
    })
  }

  // 사용자 삭제
  const deleteUserLocal = async (userId: string) => {
    if (!confirm('정말로 이 사용자를 삭제하시겠습니까?')) return

    startTransition(async () => {
      try {
        const result = await deleteUserAction(userId)

        if (result.success) {
          await fetchUsers()
        } else {
          alert(result.error || '사용자 삭제에 실패했습니다.')
        }
      } catch {
        alert('사용자 삭제 중 오류가 발생했습니다.')
      }
    })
  }

  // 이메일 확인 처리
  const confirmUserEmail = async (userId: string, userEmail: string) => {
    if (!confirm(`${userEmail}의 이메일을 확인 처리하시겠습니까?\n\n이메일 인증을 건너뛰고 즉시 로그인 가능하게 됩니다.`)) return

    try {
      setLoading(true)
      const response = await fetch('/api/users/confirm-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const result = await response.json()

      if (result.success) {
        alert('✅ 이메일 확인 처리 완료!')
        await fetchUsers()
      } else {
        alert(`❌ 실패: ${result.error}`)
      }
    } catch {
      alert('이메일 확인 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 모든 사용자 이메일 일괄 확인 처리
  const confirmAllEmails = async () => {
    if (!confirm('모든 사용자의 이메일을 확인 처리하시겠습니까?\n\n미인증 상태의 모든 사용자가 즉시 로그인 가능하게 됩니다.')) return

    try {
      setLoading(true)
      const response = await fetch('/api/users/confirm-all-emails', {
        method: 'POST'
      })

      const result = await response.json()

      if (result.success) {
        alert(`✅ 이메일 일괄 확인 처리 완료!\n\n• 전체: ${result.data.total}명\n• 이미 확인됨: ${result.data.alreadyConfirmed}명\n• 새로 확인됨: ${result.data.newlyConfirmed}명\n• 실패: ${result.data.errors}개`)
        await fetchUsers()
      } else {
        alert(`❌ 실패: ${result.error}`)
      }
    } catch {
      alert('이메일 일괄 확인 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
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
          <div className="flex gap-2">
            <Button
              onClick={confirmAllEmails}
              variant="outline"
              className="h-10 px-4"
              title="모든 미인증 사용자의 이메일을 즉시 확인 처리"
            >
              <Shield className="h-4 w-4 mr-2" />
              전체 이메일 확인
            </Button>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="h-10 px-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              새 사용자
            </Button>
          </div>
        </div>



        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium">이메일</th>
                <th className="h-12 px-4 text-left align-middle font-medium">역할</th>
                <th className="h-12 px-4 text-left align-middle font-medium">가입일</th>
                <th className="h-12 px-4 text-left align-middle font-medium">마지막 로그인</th>
                <th className="h-12 px-4 text-left align-middle font-medium">작업 이력</th>
                <th className="h-12 px-4 text-left align-middle font-medium">작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="p-4 align-middle">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium">{user.email}</div>
                        <div className="text-sm text-gray-500">ID: {user.id}</div>
                      </div>
                      {/* ✅ 이메일 확인 상태 표시 */}
                      {user.email_confirmed_at ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title="이메일 인증 완료">
                          ✓ 인증됨
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800" title="이메일 미인증">
                          ⚠ 미인증
                        </span>
                      )}
                    </div>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewHistory(user)}
                      aria-label="작업 이력 보기"
                    >
                      <History className="h-4 w-4 mr-2" />
                      작업 이력
                    </Button>
                  </td>
                  <td className="p-4 align-middle">
                    <div className="flex gap-2">
                      {/* ✅ 미인증 사용자에게 이메일 확인 버튼 표시 */}
                      {!user.email_confirmed_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => confirmUserEmail(user.id, user.email)}
                          className="text-amber-600 hover:text-amber-700"
                          title="이메일 인증 건너뛰기"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      )}
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
                        onClick={() => deleteUserLocal(user.id)}
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
              return await updateUserLocal(data as { id: string; email?: string; role?: 'admin' | 'user'; password?: string })
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

      {/* 작업 이력 모달 */}
      {historyUser && (
        <ActivityModal
          userEmail={historyUser.email}
          loading={historyLoading}
          error={historyError}
          items={historyItems}
          onClose={() => {
            setHistoryUser(null)
            setHistoryItems([])
            setHistoryError('')
            setHistoryLoading(false)
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

    // ✅ 공백 제거
    const trimmedEmail = formData.email.trim()
    const trimmedPassword = formData.password.trim()
    const trimmedConfirmPassword = formData.confirmPassword.trim()

    // 새 사용자 생성 시에만 비밀번호 확인
    if (!user && trimmedPassword !== trimmedConfirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    // 비밀번호 길이 확인 (새 사용자 또는 비밀번호 변경 시)
    if (trimmedPassword && trimmedPassword.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      setLoading(false)
      return
    }

    try {
      const data = user 
        ? { 
            id: user.id, 
            email: trimmedEmail || user.email,
            role: formData.role,
            password: trimmedPassword || undefined  // 비밀번호가 비어있으면 변경하지 않음
          }
        : { 
            email: trimmedEmail, 
            password: trimmedPassword, 
            role: formData.role 
          }

      console.log('📝 폼 제출 데이터:', {
        isEdit: !!user,
        userId: user?.id,
        email: data.email,
        role: data.role,
        hasPassword: !!(data as any).password,
        passwordLength: (data as any).password?.length || 0
      })

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
              onPaste={(e) => {
                e.preventDefault()
                const pastedText = e.clipboardData.getData('text').trim()
                setFormData({ ...formData, email: pastedText })
              }}
              required
              disabled={!!user} // 수정 시 이메일 변경 불가
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 {user && <span className="text-gray-500 text-xs">(변경 시에만 입력)</span>}
            </label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              onPaste={(e) => {
                e.preventDefault()
                const pastedText = e.clipboardData.getData('text').trim()
                setFormData({ ...formData, password: pastedText })
              }}
              required={!user} // 수정 시 선택사항
              placeholder={user ? '변경하지 않으려면 비워두세요' : '••••••••'}
            />
            {user && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                ⚠️ 새 비밀번호를 입력하면 기존 비밀번호가 변경됩니다 (최소 6자)
              </p>
            )}
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
                onPaste={(e) => {
                  e.preventDefault()
                  const pastedText = e.clipboardData.getData('text').trim()
                  setFormData({ ...formData, confirmPassword: pastedText })
                }}
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

// 작업 이력 모달 컴포넌트
function ActivityModal({ userEmail, loading, error, items, onClose }: {
  userEmail: string
  loading: boolean
  error: string
  items: Array<{ id: string; action: string; created_at: string }>
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">작업 이력 — {userEmail}</h3>
          <Button variant="outline" onClick={onClose}>닫기</Button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중...
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium">시간</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-gray-500">기록이 없습니다.</td>
                  </tr>
                )}
                {items.map((it) => (
                  <tr key={it.id} className="border-b">
                    <td className="p-4 align-middle text-sm text-gray-600">
                      {new Date(it.created_at).toLocaleString('ko-KR')}
                    </td>
                    <td className="p-4 align-middle">
                      {it.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
