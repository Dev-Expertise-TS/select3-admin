'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/contexts/AuthContext'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'user'
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  requiredRole = 'user',
  redirectTo = '/login'
}: AuthGuardProps) {
  const { user, loading, isInitialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isInitialized && !loading) {
      console.log('🛡️ AuthGuard - 인증 상태:', { user: user?.email, requiredRole })
      // 로그인하지 않은 경우
      if (!user) {
        console.log('❌ 인증되지 않은 사용자, 로그인 페이지로 리다이렉트')
        router.replace(redirectTo)
        return
      }

      // 역할이 필요한 경우
      if (requiredRole === 'admin' && user.role !== 'admin') {
        console.log('❌ 권한 부족, 홈으로 리다이렉트')
        router.replace('/') // 홈으로 리다이렉트
        return
      }
    }
  }, [user, loading, isInitialized, requiredRole, redirectTo, router])

  // 초기화되지 않았거나 로딩 중인 경우
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  // 로그인하지 않은 경우
  if (!user) {
    return null
  }

  // 역할이 필요한 경우
  if (requiredRole === 'admin' && user.role !== 'admin') {
    return null
  }

  // 인증된 사용자
  return <>{children}</>
}
