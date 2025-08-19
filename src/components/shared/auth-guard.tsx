'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

  // 로그인하지 않은 경우 - 즉시 접근 차단 화면 표시
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">접근 권한이 없습니다</h2>
          <p className="text-gray-600 mb-4">이 페이지에 접근하려면 로그인이 필요합니다.</p>
          <Link 
            href="/login" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            로그인 페이지로 이동
          </Link>
        </div>
      </div>
    )
  }

  // 역할이 필요한 경우 - 권한 부족 화면 표시
  if (requiredRole === 'admin' && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">권한이 부족합니다</h2>
          <p className="text-gray-600 mb-4">이 페이지에 접근하려면 관리자 권한이 필요합니다.</p>
          <Link 
            href="/" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  // 인증된 사용자
  return <>{children}</>
}
