'use client'

import { useMemo } from 'react'
import { HotelEditForm } from '../[sabre]/hotel-edit-form'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function NewHotelPage() {
  const router = useRouter()

  // 신규 호텔을 위한 빈 초기 데이터 (useMemo로 메모이제이션)
  const initialData = useMemo(() => ({
    sabre_id: '',
    property_name_ko: '',
    property_name_en: '',
    slug: '',
    property_address: '',
    city_ko: '',
    city_en: '',
    city_code: '',
    country_ko: '',
    country_en: '',
    country_code: '',
    continent_ko: '',
    continent_en: '',
    continent_code: '',
    region_ko: '',
    region_en: '',
    region_code: '',
    rate_plan_code: null,
    brand_id: null,
  }), [])

  return (
    <div className="min-h-[60vh]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">신규 호텔 생성</h1>
          <p className="text-sm text-muted-foreground mt-1">필수 정보를 입력하여 새로운 호텔을 생성하세요.</p>
        </div>
        <Button 
          type="button" 
          variant="outline"
          onClick={() => router.push('/admin/hotel-update')}
        >
          취소
        </Button>
      </div>

      <HotelEditForm 
        initialData={initialData}
        mappedBenefits={[]}
        isNewHotel={true}
      />
    </div>
  )
}
