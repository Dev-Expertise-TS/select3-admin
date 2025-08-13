'use client'

import React from 'react'
import { DollarSign } from 'lucide-react'
import { AuthGuard } from '@/components/shared/auth-guard'

export default function AdminAdvertisementsPage() {
  return (
    <AuthGuard requiredRole="admin">
        <div className="min-h-[60vh]">
          {/* 페이지 헤더 */}
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">광고 관리</h1>
              <p className="text-sm text-gray-600 mt-1">호텔 광고 및 프로모션을 관리하세요</p>
            </div>
          </div>

          {/* 광고 관리 콘텐츠 */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">호텔별 광고 노출 위치, 노출 순서, 노출 기간 관리</h3>
            </div>
          </div>
        </div>
    </AuthGuard>
  )
}
