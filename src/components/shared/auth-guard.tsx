'use client'

import React, { useEffect, useRef } from 'react'
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
  
  // 무한 루프 방지를 위한 ref
  const hasRedirected = useRef(false)

  useEffect(() => {
    // 이미 리다이렉트된 경우 중복 처리 방지
    if (hasRedirected.current) {
      return
    }

    if (isInitialized && !loading) {
      console.log('🛡️ AuthGuard - 인증 상태 확인:', { 
        user: user?.email, 
        role: user?.role,
        requiredRole,
        isInitialized,
        loading
      })
      
      // 로그인하지 않은 경우
      if (!user) {
        console.log('❌ 인증되지 않은 사용자, 로그인 페이지로 리다이렉트')
        hasRedirected.current = true
        router.replace(redirectTo)
        return
      }

      // 역할이 필요한 경우
      if (requiredRole === 'admin' && user.role !== 'admin') {
        console.log('❌ 권한 부족, 홈으로 리다이렉트')
        hasRedirected.current = true
        router.replace('/') // 홈으로 리다이렉트
        return
      }

      console.log('✅ 인증 확인 완료, 접근 허용')
    }
  }, [user, loading, isInitialized, requiredRole, redirectTo, router])

  // 초기화되지 않았거나 로딩 중인 경우
  if (!isInitialized || loading) {
    console.log('🔄 AuthGuard - 로딩 중:', { isInitialized, loading })
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
    console.log('🚫 AuthGuard - 인증되지 않은 사용자, 접근 차단')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">접근 제한</h2>
          <p className="text-gray-600 mb-4">로그인이 필요한 페이지입니다.</p>
          <p className="text-sm text-gray-500">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    )
  }

  // 권한이 부족한 경우
  if (requiredRole === 'admin' && user.role !== 'admin') {
    console.log('🚫 AuthGuard - 권한 부족, 접근 차단')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">권한 부족</h2>
          <p className="text-gray-600 mb-4">이 페이지에 접근할 권한이 없습니다.</p>
          <p className="text-sm text-gray-500">홈으로 이동 중...</p>
        </div>
      </div>
    )
  }

  // 인증 및 권한 확인 완료
  console.log('✅ AuthGuard - 모든 검증 통과, 컨텐츠 렌더링')
  return <>{children}</>
}
