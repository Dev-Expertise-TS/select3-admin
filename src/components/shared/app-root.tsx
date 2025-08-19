'use client'

import React, { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AppShell } from '@/components/shared/app-shell'
import { useAuth } from '@/features/auth/contexts/AuthContext'

interface AppRootProps {
  children: React.ReactNode
}

export function AppRoot({ children }: AppRootProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { isInitialized, user } = useAuth()
  const hideShell = pathname === '/login' || pathname.startsWith('/auth')

  // 로그인하지 않은 사용자가 보호된 경로에 접근하려고 할 때 - 즉시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (isInitialized && !user && !hideShell) {
      console.log('🔒 로그인하지 않은 사용자, 로그인 페이지로 자동 리다이렉트')
      router.replace('/login')
    }
  }, [isInitialized, user, hideShell, router])

  // 인증 상태가 초기화되지 않았으면 로딩 표시
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">시스템 초기화 중...</p>
        </div>
      </div>
    )
  }

  // 로그인하지 않은 사용자가 보호된 경로에 접근하려고 할 때 - 로딩 표시 (리다이렉트 중)
  if (!user && !hideShell) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    )
  }

  if (hideShell) {
    return <>{children}</>
  }

  return <AppShell>{children}</AppShell>
}


