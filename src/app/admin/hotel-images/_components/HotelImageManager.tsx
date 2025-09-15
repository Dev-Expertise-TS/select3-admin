'use client'

import React from 'react'
import { Image as ImageIcon } from 'lucide-react'
import HotelSearchWidget from '@/components/shared/hotel-search-widget'

export function HotelImageManager() {

  return (
    <div className="min-h-[60vh]">
      {/* 페이지 헤더 */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <ImageIcon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">호텔 이미지 관리</h1>
          <p className="text-sm text-gray-600 mt-1">호텔을 검색하고 선택하여 이미지 URL을 관리하세요</p>
        </div>
      </div>

      {/* 호텔 검색 위젯 - 이미지 관리 모드 활성화 */}
      <HotelSearchWidget
        title="호텔 이미지 관리"
        description="호텔을 검색하고 선택하여 이미지를 관리하세요"
        hideHeader={true}
        enableHotelEdit={false}
        showInitialHotels={false}
        enableImageManagement={true}
      />
    </div>
  )
}
