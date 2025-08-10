'use client'

import React from 'react'
import { Pencil } from 'lucide-react'
import HotelSearchWidget from '@/components/shared/hotel-search-widget'

export function HotelUpdateManager() {
  return (
    <div className="min-h-[60vh]">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <Pencil className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">호텔 정보 업데이트</h1>
          <p className="text-sm text-gray-600 mt-1">호텔의 기본 정보와 설정 값을 업데이트함.</p>
        </div>
      </div>

      <HotelSearchWidget 
        hideHeader={true}
        enableHotelEdit={true}
      />
    </div>
  )
}
