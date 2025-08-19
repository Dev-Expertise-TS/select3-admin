'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { AppShell } from '@/components/shared/app-shell'
import { useAuth } from '@/features/auth/contexts/AuthContext'

interface AppRootProps {
  children: React.ReactNode
}

export function AppRoot({ children }: AppRootProps) {
  const pathname = usePathname()
  const { isInitialized, user } = useAuth()
  const hideShell = pathname === '/login' || pathname.startsWith('/auth')
  const isAdminRoute = pathname.startsWith('/admin')

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

  // 로그인하지 않은 사용자가 admin 경로에 접근하려고 할 때
  if (isAdminRoute && !user) {
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
          <a 
            href="/login" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            로그인 페이지로 이동
          </a>
        </div>
      </div>
    )
  }

  if (hideShell) {
    return <>{children}</>
  }

  return <AppShell>{children}</AppShell>
}


