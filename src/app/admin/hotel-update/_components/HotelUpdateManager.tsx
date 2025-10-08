'use client'

import React from 'react'
import { Pencil, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import HotelSearchWidget from '@/components/shared/hotel-search-widget'
import { Button } from '@/components/ui/button'

export function HotelUpdateManager() {
  const router = useRouter()

  return (
    <div className="min-h-[60vh]">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <Pencil className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">호텔 정보 업데이트</h1>
            <p className="text-sm text-gray-600 mt-1">호텔의 기본 정보와 설정 값을 업데이트함.</p>
          </div>
        </div>
        <Button 
          type="button" 
          onClick={() => router.push('/admin/hotel-update/new')} 
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          신규 호텔 생성
        </Button>
      </div>

      <HotelSearchWidget 
        hideHeader={true}
        enableHotelEdit={true}
      />
    </div>
  )
}
