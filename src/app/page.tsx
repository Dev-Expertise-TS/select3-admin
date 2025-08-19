'use client'

import React from 'react'
import { Home as HomeIcon } from 'lucide-react'
import { DashboardStats } from '@/components/shared/dashboard-stats'
import { useAuth } from '@/features/auth/contexts/AuthContext'

export default function Home() {
  return <HomeContent />
}

function HomeContent() {
  const { user } = useAuth()

  return (
    <div className="min-h-[60vh]">
      {/* 페이지 헤더 */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <HomeIcon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">대시보드</h1>
          <p className="text-sm text-gray-600 mt-1">호텔 관리 시스템의 주요 통계와 데이터 품질을 확인하세요</p>
        </div>
      </div>

      {/* 로그인 상태 표시 */}
      {user && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-green-800">
                {user.email}님, 환영합니다!
              </p>
              <p className="text-xs text-green-600">
                역할: {user.role === 'admin' ? '관리자' : '사용자'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 대시보드 통계 */}
      <DashboardStats />
    </div>
  )
}
