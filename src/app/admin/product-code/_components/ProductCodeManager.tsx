"use client"

import HotelSearchWidget from "@/components/shared/hotel-search-widget"
import { IhgBulkDailyRatesPanel } from "./IhgBulkDailyRatesPanel"

export function ProductCodeManager() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">객실 상품 리스트 조회</h2>
          <p className="text-muted-foreground">
            Sabre API 응답 JSON에서 Rate Plan을 추출하여 투숙 기간과 인원을 포함한 조회 링크를 생성합니다.
          </p>
        </div>
      </div>

      <HotelSearchWidget 
        title="호텔 검색"
        description="호텔을 검색하고 선택하여 URL 생성을 위한 Rate Plan 정보를 조회하세요."
        hideHeader={false}
        showInitialHotels={true}
        enableUrlGeneration={true}
        ratePlanButtonText="객실 상품 코드 및 요금 조회"
        roomListTitle="객실 상품 정보"
        useProductCodeTableFormat={true}
      />

      <IhgBulkDailyRatesPanel />
    </div>
  )
}
