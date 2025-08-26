'use client'

import React, { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { AppShell } from './app-shell'

interface AppRootProps {
  children: React.ReactNode
}

export function AppRoot({ children }: AppRootProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { isInitialized, user, loading } = useAuth()
  
  // 무한 루프 방지를 위한 ref
  const hasRedirected = useRef(false)
  
  // 로그인 페이지나 인증 관련 페이지는 제외
  const hideShell = pathname === '/login' || pathname.startsWith('/auth')

  useEffect(() => {
    // 이미 리다이렉트된 경우 중복 처리 방지
    if (hasRedirected.current) {
      return
    }

    console.log('🏠 AppRoot - 인증 상태 확인:', {
      pathname,
      isInitialized,
      loading,
      hasUser: !!user,
      userEmail: user?.email,
      hideShell
    })

    // 인증이 초기화되고 로딩이 완료된 후에만 처리
    if (isInitialized && !loading) {
      // 로그인하지 않은 사용자가 보호된 경로에 접근하려고 할 때
      if (!user && !hideShell) {
        console.log('🔒 로그인하지 않은 사용자, 로그인 페이지로 자동 리다이렉트')
        hasRedirected.current = true
        router.replace('/login')
        return
      }

      // 이미 로그인된 사용자가 로그인 페이지에 접근하려고 할 때
      if (user && pathname === '/login') {
        console.log('✅ 이미 로그인된 사용자, 홈으로 리다이렉트')
        hasRedirected.current = true
        router.replace('/')
        return
      }
    }
  }, [isInitialized, loading, user, pathname, hideShell, router])

  // 인증 상태가 초기화되지 않았으면 로딩 표시
  if (!isInitialized) {
    console.log('🔄 AppRoot - 인증 초기화 대기 중...')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">시스템 초기화 중...</p>
        </div>
      </div>
    )
  }

  // 로딩 중인 경우
  if (loading) {
    console.log('🔄 AppRoot - 인증 상태 로딩 중...')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">인증 상태 확인 중...</p>
        </div>
      </div>
    )
  }

  // 로그인하지 않은 사용자가 보호된 경로에 접근하려고 할 때 - 로딩 표시 (리다이렉트 중)
  if (!user && !hideShell) {
    console.log('🔄 AppRoot - 로그인 페이지로 리다이렉트 중...')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    )
  }

  // 로그인 페이지나 인증 관련 페이지는 AppShell 없이 렌더링
  if (hideShell) {
    console.log('🔓 AppRoot - 인증 페이지 렌더링 (AppShell 없음)')
    return <>{children}</>
  }

  // 보호된 경로는 AppShell과 함께 렌더링
  console.log('🏠 AppRoot - 보호된 경로 렌더링 (AppShell 포함)')
  return <AppShell>{children}</AppShell>
}


