'use client'

import React from 'react'
import { FileText } from 'lucide-react'
import { AuthGuard } from '@/components/shared/auth-guard'

export default function AdminHotelContentPage() {
  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-[60vh]">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">호텔 콘텐츠 관리</h1>
            <p className="text-sm text-gray-600 mt-1">호텔 상세 콘텐츠(설명, 포인트, 편의시설 등)를 관리합니다.</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="text-center py-12 text-gray-600">
            기능 준비 중입니다.
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}


