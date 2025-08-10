'use client';

import React from 'react';
import { DollarSign } from 'lucide-react';
import HotelSearchWidget from '@/components/shared/hotel-search-widget';

export default function AdminHotelSearchPage() {
  return (
    <div className="min-h-[60vh]">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <DollarSign className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sabre API 요금 코드 관리</h1>
          <p className="text-sm text-gray-600 mt-1">호텔의 요금 코드를 검색하고 테스트하세요</p>
        </div>
      </div>

      <HotelSearchWidget 
        hideHeader={true}
        enableHotelEdit={false}
      />
    </div>
  );
}