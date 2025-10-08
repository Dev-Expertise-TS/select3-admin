'use client'

import React, { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BenefitsManager, type BenefitRow as BBRow } from '@/features/hotels/components/benefits-manager'
import { BenefitsAddButton } from '@/features/hotels/components/benefits-add-button'
import { ChainBrandPicker, type Chain, type Brand } from '@/features/hotels/components/chain-brand-picker'
import { Button } from '@/components/ui/button'
import { RegionSelector } from '@/components/shared/region-selector'
import { RatePlanCodesEditor } from '@/components/shared/rate-plan-codes-editor'

import { cn } from '@/lib/utils'
import { updateHotel } from '@/features/hotels/actions'

interface Props {
  initialData: Record<string, unknown>
  mappedBenefits: BBRow[]
}

export function HotelEditForm({ initialData, mappedBenefits }: Props) {
  const router = useRouter()
  const [isEditMode, setIsEditMode] = React.useState(false)
  const formRef = React.useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  // 폼 데이터 상태 관리
  const [formData, setFormData] = React.useState({
    sabre_id: String(initialData.sabre_id ?? ''),
    property_name_ko: String(initialData.property_name_ko ?? ''),
    property_name_en: String(initialData.property_name_en ?? ''),
    property_address: String(initialData.property_address ?? ''),
    city_ko: String(initialData.city_ko ?? ''),
    city_en: String(initialData.city_en ?? ''),
    city_code: String(initialData.city_code ?? ''),
    country_ko: String(initialData.country_ko ?? ''),
    country_en: String(initialData.country_en ?? ''),
    country_code: String(initialData.country_code ?? ''),
    continent_ko: String(initialData.continent_ko ?? ''),
    continent_en: String(initialData.continent_en ?? ''),
    continent_code: String(initialData.continent_code ?? ''),
    region_ko: String(initialData.region_ko ?? ''),
    region_en: String(initialData.region_en ?? ''),
    region_code: String(initialData.region_code ?? ''),
    rate_plan_codes: Array.isArray(initialData.rate_plan_codes) 
      ? initialData.rate_plan_codes as string[]
      : initialData.rate_plan_code
        ? (typeof initialData.rate_plan_code === 'string' 
            ? initialData.rate_plan_code.split(',').map(s => s.trim()).filter(Boolean)
            : Array.isArray(initialData.rate_plan_code) 
              ? initialData.rate_plan_code as string[]
              : [])
        : []
  })

  // 하이라이트된 필드 추적
  const [highlightedFields, setHighlightedFields] = React.useState<Set<string>>(new Set())
  
  // 현재 brand_id 상태 (선택된 브랜드에 따라 업데이트)
  const [currentBrandId, setCurrentBrandId] = React.useState<number | null>(() => {
    return initialData.brand_id ? Number(initialData.brand_id) : null
  })

  // 체인/브랜드 선택 팝업 상태
  const [isChainBrandPickerOpen, setIsChainBrandPickerOpen] = React.useState(false)
  const [selectedChain, setSelectedChain] = React.useState<Chain | null>(() => {
    if (initialData.hotel_chains) {
      const chains = initialData.hotel_chains as Record<string, unknown> | null
      
      return chains ? {
        chain_id: Number(chains.chain_id ?? 0),
        name_kr: String(chains.name_kr ?? ''),
        name_en: String(chains.name_en ?? ''),
        slug: String(chains.slug ?? '')
      } : null
    }
    return null
  })
  const [selectedBrand, setSelectedBrand] = React.useState<Brand | null>(() => {
    const brands = initialData.hotel_brands as Record<string, unknown> | null
    
    return brands ? {
      brand_id: Number(brands.brand_id ?? 0),
      chain_id: Number(brands.chain_id ?? 0) || null,
      name_kr: String(brands.name_kr ?? ''),
      name_en: String(brands.name_en ?? '')
    } : null
  })
  
  const toggleEditMode = () => {
    setIsEditMode(prev => {
      if (prev) {
        // 편집 모드 종료 시 원본 데이터로 복원 및 하이라이트 초기화
        setFormData({
          sabre_id: String(initialData.sabre_id ?? ''),
          property_name_ko: String(initialData.property_name_ko ?? ''),
          property_name_en: String(initialData.property_name_en ?? ''),
          property_address: String(initialData.property_address ?? ''),
          city_ko: String(initialData.city_ko ?? ''),
          city_en: String(initialData.city_en ?? ''),
          city_code: String(initialData.city_code ?? ''),
          country_ko: String(initialData.country_ko ?? ''),
          country_en: String(initialData.country_en ?? ''),
          country_code: String(initialData.country_code ?? ''),
          continent_ko: String(initialData.continent_ko ?? ''),
          continent_en: String(initialData.continent_en ?? ''),
          continent_code: String(initialData.continent_code ?? ''),
          region_ko: String(initialData.region_ko ?? ''),
          region_en: String(initialData.region_en ?? ''),
          region_code: String(initialData.region_code ?? ''),
          rate_plan_codes: Array.isArray(initialData.rate_plan_codes) 
            ? initialData.rate_plan_codes as string[]
            : initialData.rate_plan_code
              ? (typeof initialData.rate_plan_code === 'string' 
                  ? initialData.rate_plan_code.split(',').map(s => s.trim()).filter(Boolean)
                  : Array.isArray(initialData.rate_plan_code) 
                    ? initialData.rate_plan_code as string[]
                    : [])
              : []
        })
        setHighlightedFields(new Set())
      }
      return !prev
    })
  }

  const handleSave = async (submitFormData: FormData) => {
    startTransition(async () => {
      try {
        // 편집 모드에서만 해당 필드들을 FormData에서 읽고, 아니면 현재 상태 값 사용
        const sabreIdEditable = isEditMode 
          ? (submitFormData.get('sabre_id_editable') as string | null)?.trim() || null
          : formData.sabre_id
        const property_name_ko = isEditMode
          ? (submitFormData.get('property_name_ko') as string | null) ?? null
          : formData.property_name_ko
        const property_name_en = isEditMode
          ? (submitFormData.get('property_name_en') as string | null) ?? null
          : formData.property_name_en
        const property_address = isEditMode
          ? (submitFormData.get('property_address') as string | null) ?? null
          : formData.property_address
        const city_ko = isEditMode
          ? (submitFormData.get('city_ko') as string | null) ?? null
          : formData.city_ko
        const city_en = isEditMode
          ? (submitFormData.get('city_en') as string | null) ?? null
          : formData.city_en
        const country_ko = isEditMode
          ? (submitFormData.get('country_ko') as string | null) ?? null
          : formData.country_ko
        const country_en = isEditMode
          ? (submitFormData.get('country_en') as string | null) ?? null
          : formData.country_en
        const continent_ko = isEditMode
          ? (submitFormData.get('continent_ko') as string | null) ?? null
          : formData.continent_ko
        const continent_en = isEditMode
          ? (submitFormData.get('continent_en') as string | null) ?? null
          : formData.continent_en

        // FormData에 현재 상태 값들을 추가 (편집 모드가 아닐 때를 위해)
        if (!isEditMode) {
          submitFormData.set('sabre_id_editable', formData.sabre_id)
          submitFormData.set('property_name_ko', formData.property_name_ko)
          submitFormData.set('property_name_en', formData.property_name_en)
          submitFormData.set('property_address', formData.property_address)
          submitFormData.set('city_ko', formData.city_ko)
          submitFormData.set('city_en', formData.city_en)
          submitFormData.set('city_code', formData.city_code)
          submitFormData.set('country_ko', formData.country_ko)
          submitFormData.set('country_en', formData.country_en)
          submitFormData.set('country_code', formData.country_code)
          submitFormData.set('continent_ko', formData.continent_ko)
          submitFormData.set('continent_en', formData.continent_en)
          submitFormData.set('continent_code', formData.continent_code)
          submitFormData.set('region_ko', formData.region_ko)
          submitFormData.set('region_en', formData.region_en)
          submitFormData.set('region_code', formData.region_code)
          submitFormData.set('rate_plan_codes', JSON.stringify(formData.rate_plan_codes))
        }
        
        // 브랜드 정보만 FormData에 추가 (chain_id는 select_hotels 테이블에 없음)
        if (currentBrandId) {
          submitFormData.set('brand_id', String(currentBrandId))
        } else {
          // 브랜드 선택 해제된 경우
          submitFormData.set('brand_id', '')
        }

        // Server Action 호출
        submitFormData.set('sabre_id', formData.sabre_id)
        const result = await updateHotel(submitFormData)
        
        if (!result.success) {
          throw new Error(result.error || '저장에 실패했습니다.')
        }

        // 상태 업데이트 - 현재 값들을 그대로 유지
        setFormData({
          sabre_id: sabreIdEditable || formData.sabre_id,
          property_name_ko: property_name_ko || formData.property_name_ko,
          property_name_en: property_name_en || formData.property_name_en,
          property_address: property_address || formData.property_address,
          city_ko: city_ko || formData.city_ko,
          city_en: city_en || formData.city_en,
          city_code: formData.city_code,
          country_ko: country_ko || formData.country_ko,
          country_en: country_en || formData.country_en,
          country_code: formData.country_code,
          continent_ko: continent_ko || formData.continent_ko,
          continent_en: continent_en || formData.continent_en,
          continent_code: formData.continent_code,
          region_ko: formData.region_ko,
          region_en: formData.region_en,
          region_code: formData.region_code,
          rate_plan_codes: formData.rate_plan_codes
        })

        // 체인/브랜드 상태도 업데이트 (저장된 값으로)
        // 저장 성공 후 추가 처리는 필요 없음
        // 편집 모드 상태를 저장 (모드 변경 전에)
        const wasInEditMode = isEditMode
        
        // 편집 모드 종료
        setIsEditMode(false)

        // 편집 모드였을 때만 기본 정보 필드 변경 검사 (혜택만 변경한 경우 제외)
        const fieldNames = new Set<string>()
        
        if (wasInEditMode) {
          // 편집 모드에서 저장한 경우에만 변경 감지
          if (String(initialData.sabre_id ?? '') !== String(sabreIdEditable ?? '')) {
            fieldNames.add('sabre_id')
          }
          if (String(initialData.property_name_ko ?? '') !== String(property_name_ko ?? '')) {
            fieldNames.add('property_name_ko')
          }
          if (String(initialData.property_name_en ?? '') !== String(property_name_en ?? '')) {
            fieldNames.add('property_name_en')
          }
          if (String(initialData.property_address ?? '') !== String(property_address ?? '')) {
            fieldNames.add('property_address')
          }
          if (String(initialData.city_ko ?? '') !== String(city_ko ?? '')) {
            fieldNames.add('city_ko')
          }
          if (String(initialData.city_en ?? '') !== String(city_en ?? '')) {
            fieldNames.add('city_en')
          }
          if (String(initialData.city_code ?? '') !== String(formData.city_code ?? '')) {
            fieldNames.add('city_code')
          }
          if (String(initialData.country_ko ?? '') !== String(country_ko ?? '')) {
            fieldNames.add('country_ko')
          }
          if (String(initialData.country_en ?? '') !== String(country_en ?? '')) {
            fieldNames.add('country_en')
          }
          if (String(initialData.country_code ?? '') !== String(formData.country_code ?? '')) {
            fieldNames.add('country_code')
          }
          if (String(initialData.continent_ko ?? '') !== String(continent_ko ?? '')) {
            fieldNames.add('continent_ko')
          }
          if (String(initialData.continent_en ?? '') !== String(continent_en ?? '')) {
            fieldNames.add('continent_en')
          }
          if (String(initialData.continent_code ?? '') !== String(formData.continent_code ?? '')) {
            fieldNames.add('continent_code')
          }
          if (String(initialData.region_ko ?? '') !== String(formData.region_ko ?? '')) {
            fieldNames.add('region_ko')
          }
          if (String(initialData.region_en ?? '') !== String(formData.region_en ?? '')) {
            fieldNames.add('region_en')
          }
          if (String(initialData.region_code ?? '') !== String(formData.region_code ?? '')) {
            fieldNames.add('region_code')
          }
          
          // Rate Plan Codes 변경 검사
          const initialRatePlanCodes = Array.isArray(initialData.rate_plan_codes) 
            ? initialData.rate_plan_codes as string[]
            : initialData.rate_plan_code
              ? (typeof initialData.rate_plan_code === 'string' 
                  ? initialData.rate_plan_code.split(',').map(s => s.trim()).filter(Boolean)
                  : Array.isArray(initialData.rate_plan_code) 
                    ? initialData.rate_plan_code as string[]
                    : [])
              : []
          
          const currentRatePlanCodes = formData.rate_plan_codes
          if (JSON.stringify(initialRatePlanCodes.sort()) !== JSON.stringify(currentRatePlanCodes.sort())) {
            fieldNames.add('rate_plan_codes')
          }
        }
        
        // 체인/브랜드 변경 검사 (편집 모드와 관계없이)
        const initialBrandId = initialData.brand_id ? Number(initialData.brand_id) : null
        if (currentBrandId !== initialBrandId) {
          fieldNames.add('chain_field')
          fieldNames.add('brand_field')
        }
        
        // 변경된 필드만 하이라이트 (변경되지 않은 필드는 자동으로 원래 색상)
        setHighlightedFields(fieldNames)
        
        // 1.5초 후 모든 하이라이트 제거
        if (fieldNames.size > 0) {
          setTimeout(() => {
            setHighlightedFields(new Set())
          }, 1500)
        }

        // Benefits 변경 이벤트 트리거
        window.dispatchEvent(new CustomEvent('benefits:commit'))
        
        alert('변경 사항을 저장하였습니다.')
      } catch (error) {
        console.error('저장 오류:', error)
        alert(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.')
      }
    })
  }

  // 입력 필드 값 변경 핸들러
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 체인/브랜드 선택 핸들러
  const handleChainBrandSelect = (chain: Chain | null, brand: Brand | null) => {
    console.log('=== 체인/브랜드 선택 핸들러 ===')
    console.log('선택된 체인:', chain)
    console.log('선택된 브랜드:', brand)
    
    setSelectedChain(chain)
    setSelectedBrand(brand)
    
    // 브랜드가 선택되면 currentBrandId 업데이트
    if (brand?.brand_id) {
      setCurrentBrandId(brand.brand_id)
      console.log('currentBrandId 설정:', brand.brand_id)
    } else {
      setCurrentBrandId(null)
      console.log('currentBrandId 해제')
    }
    
    // 브랜드가 선택되면 해당 브랜드의 체인으로 체인 정보도 업데이트
    if (brand && chain && brand.chain_id === chain.chain_id) {
      setSelectedChain(chain)
      console.log('브랜드와 일치하는 체인으로 설정:', chain)
    } else if (brand && !chain) {
      // 브랜드만 선택된 경우, 체인 정보는 API에서 자동으로 설정될 것이므로 여기서는 처리하지 않음
      console.log('브랜드만 선택됨, 체인은 API에서 자동 설정')
    }
    
    console.log('최종 상태:')
    console.log('  selectedChain:', chain)
    console.log('  selectedBrand:', brand)
    console.log('  currentBrandId:', brand?.brand_id || null)
    console.log('===============================')
  }

  // 체인/브랜드 필드 클릭 핸들러
  const handleChainBrandClick = () => {
    console.log('=== 체인/브랜드 필드 클릭 ===')
    console.log('현재 선택된 체인:', selectedChain)
    console.log('현재 선택된 브랜드:', selectedBrand)
    console.log('현재 currentBrandId:', currentBrandId)
    console.log('===============================')
    
    setIsChainBrandPickerOpen(true)
  }

  return (
    <>
      <div className="mb-4 text-sm">
        <button 
          onClick={() => router.back()}
          className="text-blue-600 hover:underline"
        >
          ← 목록으로 돌아가기
        </button>
      </div>

      <form 
        ref={formRef}
        action={handleSave} 
        className="space-y-6" 
        suppressHydrationWarning
      >
        <input type="hidden" name="sabre_id" value={String(initialData.sabre_id ?? '')} />
        
        {/* 기본 정보 섹션 */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
            <Button 
              type="button" 
              variant="teal"
              size="sm"
              onClick={toggleEditMode}
            >
              {isEditMode ? '편집 취소' : '수정 하기'}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Sabre ID */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Sabre ID</label>
              {isEditMode ? (
                <input 
                  name="sabre_id_editable" 
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-sky-50 transition-colors duration-300" 
                  value={formData.sabre_id}
                  onChange={(e) => handleInputChange('sabre_id', e.target.value)}
                  data-initial={String(initialData.sabre_id ?? '')} 
                />
              ) : (
                <div className={cn(
                  "w-full px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors duration-300",
                  highlightedFields.has('sabre_id') ? "bg-yellow-100" : "bg-gray-50"
                )}>
                  {formData.sabre_id || '-'}
                </div>
              )}
            </div>
            
            {/* 호텔명(한글) */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">호텔명(한글)</label>
              {isEditMode ? (
                <input 
                  name="property_name_ko" 
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-sky-50 transition-colors duration-300" 
                  value={formData.property_name_ko}
                  onChange={(e) => handleInputChange('property_name_ko', e.target.value)}
                />
              ) : (
                <div className={cn(
                  "w-full px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors duration-300",
                  highlightedFields.has('property_name_ko') ? "bg-yellow-100" : "bg-gray-50"
                )}>
                  {formData.property_name_ko || '-'}
                </div>
              )}
            </div>
            
            {/* 호텔명(영문) */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">호텔명(영문)</label>
              {isEditMode ? (
                <input 
                  name="property_name_en" 
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-sky-50 transition-colors duration-300" 
                  value={formData.property_name_en}
                  onChange={(e) => handleInputChange('property_name_en', e.target.value)}
                />
              ) : (
                <div className={cn(
                  "w-full px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors duration-300",
                  highlightedFields.has('property_name_en') ? "bg-yellow-100" : "bg-gray-50"
                )}>
                  {formData.property_name_en || '-'}
                </div>
              )}
            </div>
            
            {/* 체인 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">체인</label>
                {selectedChain?.chain_id && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    ID: {selectedChain.chain_id}
                  </span>
                )}
              </div>
              <div 
                className={cn(
                  "flex gap-2 transition-colors",
                  isEditMode ? "cursor-pointer" : "cursor-default"
                )}
                onClick={isEditMode ? handleChainBrandClick : undefined}
                title={isEditMode ? "클릭하여 체인/브랜드 선택" : "수정 모드에서만 변경 가능"}
              >
                <div className={cn(
                  "flex-1 px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors",
                  isEditMode 
                    ? "bg-sky-50 hover:bg-sky-100" 
                    : highlightedFields.has('chain_field')
                      ? "bg-yellow-100"
                      : "bg-gray-50"
                )}>
                  {selectedChain?.name_kr || '-'}
                </div>
                <div className={cn(
                  "flex-1 px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors",
                  isEditMode 
                    ? "bg-sky-50 hover:bg-sky-100" 
                    : highlightedFields.has('chain_field')
                      ? "bg-yellow-100"
                      : "bg-gray-50"
                )}>
                  {selectedChain?.name_en || '-'}
                </div>
              </div>
            </div>
            
            {/* 브랜드 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">브랜드</label>
                {currentBrandId != null && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    ID: {currentBrandId}
                  </span>
                )}
              </div>
              <div 
                className={cn(
                  "flex gap-2 transition-colors",
                  isEditMode ? "cursor-pointer" : "cursor-default"
                )}
                onClick={isEditMode ? handleChainBrandClick : undefined}
                title={isEditMode ? "클릭하여 체인/브랜드 선택" : "수정 모드에서만 변경 가능"}
              >
                <div className={cn(
                  "flex-1 px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors",
                  isEditMode 
                    ? "bg-sky-50 hover:bg-sky-100" 
                    : highlightedFields.has('brand_field')
                      ? "bg-yellow-100"
                      : "bg-gray-50"
                )}>
                  {selectedBrand?.name_kr || '-'}
                </div>
                <div className={cn(
                  "flex-1 px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors",
                  isEditMode 
                    ? "bg-sky-50 hover:bg-sky-100" 
                    : highlightedFields.has('brand_field')
                      ? "bg-yellow-100"
                      : "bg-gray-50"
                )}>
                  {selectedBrand?.name_en || '-'}
                </div>
              </div>
            </div>
            
            {/* Rate Plan Codes */}
            <div className="space-y-1 md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700">Rate Plan Codes</label>
              {isEditMode ? (
                <>
                  <RatePlanCodesEditor
                    value={formData.rate_plan_codes}
                    onChange={(codes) => {
                      setFormData(prev => ({ ...prev, rate_plan_codes: codes }))
                    }}
                    disabled={false}
                  />
                  <input type="hidden" name="rate_plan_codes" value={JSON.stringify(formData.rate_plan_codes)} />
                </>
              ) : (
                <div className={cn(
                  "w-full px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors duration-300",
                  highlightedFields.has('rate_plan_codes') ? "bg-yellow-100" : "bg-gray-50"
                )}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {formData.rate_plan_codes.length > 0 ? (
                      formData.rate_plan_codes.map((code) => (
                        <span key={code} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {code}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 주소 및 위치 정보 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-md font-semibold text-gray-900 mb-4">주소 및 위치 정보</h3>
            <div className="space-y-6">
              {/* 호텔 주소 */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">호텔 주소</label>
                {isEditMode ? (
                  <input 
                    name="property_address" 
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-sky-50 transition-colors duration-300" 
                    value={formData.property_address}
                    onChange={(e) => handleInputChange('property_address', e.target.value)}
                  />
                ) : (
                  <div className={cn(
                    "w-full px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors duration-300",
                    highlightedFields.has('property_address') ? "bg-yellow-100" : "bg-gray-50"
                  )}>
                    {formData.property_address || '-'}
                  </div>
                )}
              </div>

              {/* 도시 / 국가 (2열) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 도시 */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    도시
                    {formData.city_code && (
                      <span className="ml-2 text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {formData.city_code}
                      </span>
                    )}
                  </label>
                  {isEditMode ? (
                    <>
                      <RegionSelector
                        regionType="city"
                        value={{ ko: formData.city_ko, en: formData.city_en, code: formData.city_code }}
                        onChange={(val) => {
                          setFormData(prev => ({
                            ...prev,
                            city_ko: val.ko,
                            city_en: val.en,
                            city_code: val.code || ''
                          }))
                        }}
                        disabled={false}
                      />
                      <input type="hidden" name="city_ko" value={formData.city_ko} />
                      <input type="hidden" name="city_en" value={formData.city_en} />
                      <input type="hidden" name="city_code" value={formData.city_code} />
                    </>
                  ) : (
                    <div className={cn(
                      "w-full px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors duration-300",
                      highlightedFields.has('city_ko') || highlightedFields.has('city_en') ? "bg-yellow-100" : "bg-gray-50"
                    )}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{formData.city_ko || formData.city_en || '-'}</span>
                        {formData.city_en && formData.city_ko && (
                          <span className="text-gray-500">/ {formData.city_en}</span>
                        )}
                        {formData.city_code && (
                          <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">[{formData.city_code}]</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 국가 */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    국가
                    {formData.country_code && (
                      <span className="ml-2 text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {formData.country_code}
                      </span>
                    )}
                  </label>
                  {isEditMode ? (
                    <>
                      <RegionSelector
                        regionType="country"
                        value={{ ko: formData.country_ko, en: formData.country_en, code: formData.country_code }}
                        onChange={(val) => {
                          setFormData(prev => ({
                            ...prev,
                            country_ko: val.ko,
                            country_en: val.en,
                            country_code: val.code || ''
                          }))
                        }}
                        disabled={false}
                      />
                      <input type="hidden" name="country_ko" value={formData.country_ko} />
                      <input type="hidden" name="country_en" value={formData.country_en} />
                      <input type="hidden" name="country_code" value={formData.country_code} />
                    </>
                  ) : (
                    <div className={cn(
                      "w-full px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors duration-300",
                      highlightedFields.has('country_ko') || highlightedFields.has('country_en') ? "bg-yellow-100" : "bg-gray-50"
                    )}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{formData.country_ko || formData.country_en || '-'}</span>
                        {formData.country_en && formData.country_ko && (
                          <span className="text-gray-500">/ {formData.country_en}</span>
                        )}
                        {formData.country_code && (
                          <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">[{formData.country_code}]</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 대륙 / 지역 (2열) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 대륙 */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    대륙
                    {formData.continent_code && (
                      <span className="ml-2 text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {formData.continent_code}
                      </span>
                    )}
                  </label>
                  {isEditMode ? (
                    <>
                      <RegionSelector
                        regionType="continent"
                        value={{ ko: formData.continent_ko, en: formData.continent_en, code: formData.continent_code }}
                        onChange={(val) => {
                          setFormData(prev => ({
                            ...prev,
                            continent_ko: val.ko,
                            continent_en: val.en,
                            continent_code: val.code || ''
                          }))
                        }}
                        disabled={false}
                      />
                      <input type="hidden" name="continent_ko" value={formData.continent_ko} />
                      <input type="hidden" name="continent_en" value={formData.continent_en} />
                      <input type="hidden" name="continent_code" value={formData.continent_code} />
                    </>
                  ) : (
                    <div className={cn(
                      "w-full px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors duration-300",
                      highlightedFields.has('continent_ko') || highlightedFields.has('continent_en') ? "bg-yellow-100" : "bg-gray-50"
                    )}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{formData.continent_ko || formData.continent_en || '-'}</span>
                        {formData.continent_en && formData.continent_ko && (
                          <span className="text-gray-500">/ {formData.continent_en}</span>
                        )}
                        {formData.continent_code && (
                          <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">[{formData.continent_code}]</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 지역 */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    지역
                    {formData.region_code && (
                      <span className="ml-2 text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {formData.region_code}
                      </span>
                    )}
                  </label>
                  {isEditMode ? (
                    <>
                      <RegionSelector
                        regionType="region"
                        value={{ ko: formData.region_ko, en: formData.region_en, code: formData.region_code }}
                        onChange={(val) => {
                          setFormData(prev => ({
                            ...prev,
                            region_ko: val.ko,
                            region_en: val.en,
                            region_code: val.code || ''
                          }))
                        }}
                        disabled={false}
                      />
                      <input type="hidden" name="region_ko" value={formData.region_ko} />
                      <input type="hidden" name="region_en" value={formData.region_en} />
                      <input type="hidden" name="region_code" value={formData.region_code} />
                    </>
                  ) : (
                    <div className={cn(
                      "w-full px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors duration-300",
                      highlightedFields.has('region_ko') || highlightedFields.has('region_en') ? "bg-yellow-100" : "bg-gray-50"
                    )}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{formData.region_ko || formData.region_en || '-'}</span>
                        {formData.region_en && formData.region_ko && (
                          <span className="text-gray-500">/ {formData.region_en}</span>
                        )}
                        {formData.region_code && (
                          <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">[{formData.region_code}]</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 혜택 섹션 */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">혜택</h2>
            <BenefitsAddButton />
          </div>
          <BenefitsManager initial={mappedBenefits} />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button 
            type="submit" 
            disabled={isPending}
            className={cn(
              "bg-blue-600 text-white hover:bg-blue-700",
              isPending && "opacity-50 cursor-not-allowed"
            )}
          >
            {isPending ? '저장 중...' : '저장'}
          </Button>
          <Link href="/admin/hotel-update" className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">취소</Link>
        </div>
      </form>

      {/* 체인/브랜드 선택 팝업 */}
      <ChainBrandPicker
        isOpen={isChainBrandPickerOpen}
        onClose={() => setIsChainBrandPickerOpen(false)}
        onSelect={handleChainBrandSelect}
        selectedChainId={selectedChain?.chain_id || null}
        selectedBrandId={selectedBrand?.brand_id || null}
      />
    </>
  )
}
