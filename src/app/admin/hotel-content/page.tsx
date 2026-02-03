'use client'

import React from 'react'
import { FileText } from 'lucide-react'
import HotelSearchWidget from '@/components/shared/hotel-search-widget'
import { AuthGuard } from '@/components/shared/auth-guard'

export default function HotelContentPage() {
  return (
    <AuthGuard requiredRole="admin">
      <HotelContentManager />
    </AuthGuard>
  )
}

function HotelContentManager() {
  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-blue-600 p-2">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            호텔 기본 소개 관리
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            호텔을 검색하고 테이블에서 행을 클릭하면 슬라이딩 패널에서 property_details 콘텐츠를 편집하거나 WordPress 블로그에서 자동으로 추출하세요
          </p>
        </div>
      </div>

      {/* 호텔 검색 및 결과 테이블 — 행 클릭 시 슬라이딩 패널로 편집 */}
      <div className="space-y-6">
        <HotelSearchWidget
          hideHeader={true}
          showInitialHotels={true}
          enableHotelEdit={false}
          enableContentEditing={true}
        />
      </div>
    </div>
  )
}
