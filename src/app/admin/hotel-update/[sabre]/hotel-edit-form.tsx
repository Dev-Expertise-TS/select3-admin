'use client'

import React, { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BenefitsManager, type BenefitRow as BBRow } from '@/features/hotels/components/benefits-manager'
import { BenefitsAddButton } from '@/features/hotels/components/benefits-add-button'
import { ChainBrandPicker, type Chain, type Brand } from '@/features/hotels/components/chain-brand-picker'
import { Button } from '@/components/ui/button'
import { RegionSelector } from '@/components/shared/region-selector'
import { RatePlanCodesEditor } from '@/components/shared/rate-plan-codes-editor'
import { Tabs } from '@/components/shared/tabs'

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleChainBrandSelect = (chain: Chain | null, brand: Brand | null) => {
    setSelectedChain(chain)
    setSelectedBrand(brand)
    if (brand) {
      setCurrentBrandId(brand.brand_id)
    } else {
      setCurrentBrandId(null)
    }
    setIsChainBrandPickerOpen(false)
    
    // 체인/브랜드 변경 시 하이라이트
    setHighlightedFields(prev => new Set([...prev, 'chain_field', 'brand_field']))
  }

  const handleSave = async () => {
    if (!isEditMode) return

    startTransition(async () => {
      try {
        const formDataToSubmit = new FormData()
        formDataToSubmit.append('sabre_id', formData.sabre_id)
        formDataToSubmit.append('property_name_ko', formData.property_name_ko)
        formDataToSubmit.append('property_name_en', formData.property_name_en)
        formDataToSubmit.append('property_address', formData.property_address)
        formDataToSubmit.append('city_ko', formData.city_ko)
        formDataToSubmit.append('city_en', formData.city_en)
        formDataToSubmit.append('city_code', formData.city_code)
        formDataToSubmit.append('country_ko', formData.country_ko)
        formDataToSubmit.append('country_en', formData.country_en)
        formDataToSubmit.append('country_code', formData.country_code)
        formDataToSubmit.append('continent_ko', formData.continent_ko)
        formDataToSubmit.append('continent_en', formData.continent_en)
        formDataToSubmit.append('continent_code', formData.continent_code)
        formDataToSubmit.append('region_ko', formData.region_ko)
        formDataToSubmit.append('region_en', formData.region_en)
        formDataToSubmit.append('region_code', formData.region_code)
        formDataToSubmit.append('rate_plan_codes', JSON.stringify(formData.rate_plan_codes))
        
        if (selectedChain) {
          formDataToSubmit.append('chain_id', String(selectedChain.chain_id))
        }
        if (selectedBrand) {
          formDataToSubmit.append('brand_id', String(selectedBrand.brand_id))
        }

        const result = await updateHotel(formDataToSubmit)
        
        if (result.success) {
          // 성공 시 편집 모드 종료 및 하이라이트 초기화
          setIsEditMode(false)
          setHighlightedFields(new Set())
          
          // 폼 데이터를 최신 데이터로 업데이트
          if (result.data) {
            setFormData(prev => ({
              ...prev,
              property_name_ko: String(result.data.property_name_ko ?? prev.property_name_ko),
              property_name_en: String(result.data.property_name_en ?? prev.property_name_en),
              property_address: String(result.data.property_address ?? prev.property_address),
              city_ko: String(result.data.city_ko ?? prev.city_ko),
              city_en: String(result.data.city_en ?? prev.city_en),
              city_code: String(result.data.city_code ?? prev.city_code),
              country_ko: String(result.data.country_ko ?? prev.country_ko),
              country_en: String(result.data.country_en ?? prev.country_en),
              country_code: String(result.data.country_code ?? prev.country_code),
              continent_ko: String(result.data.continent_ko ?? prev.continent_ko),
              continent_en: String(result.data.continent_en ?? prev.continent_en),
              continent_code: String(result.data.continent_code ?? prev.continent_code),
              region_ko: String(result.data.region_ko ?? prev.region_ko),
              region_en: String(result.data.region_en ?? prev.region_en),
              region_code: String(result.data.region_code ?? prev.region_code),
              rate_plan_codes: result.data.rate_plan_codes || prev.rate_plan_codes
            }))
          }
        } else {
          console.error('호텔 정보 업데이트 실패:', result.error)
        }
      } catch (error) {
        console.error('호텔 정보 업데이트 중 오류:', error)
      }
    })
  }


  // 기본 정보 탭 콘텐츠
  const BasicInfoTab = () => (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Sabre ID */}
          <div className="space-y-1 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Sabre ID</label>
            {isEditMode ? (
              <input
                type="text"
                name="sabre_id_editable"
                value={formData.sabre_id}
                onChange={(e) => handleInputChange('sabre_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Sabre ID"
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
          <div className="space-y-1 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">호텔명(한글)</label>
            {isEditMode ? (
              <input
                type="text"
                name="property_name_ko"
                value={formData.property_name_ko}
                onChange={(e) => handleInputChange('property_name_ko', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="호텔명(한글)"
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
          <div className="space-y-1 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">호텔명(영문)</label>
            {isEditMode ? (
              <input
                type="text"
                name="property_name_en"
                value={formData.property_name_en}
                onChange={(e) => handleInputChange('property_name_en', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="호텔명(영문)"
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

          {/* 체인 정보 */}
          <div className="space-y-1 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">체인 정보</label>
            {isEditMode ? (
              <div 
                onClick={() => setIsChainBrandPickerOpen(true)}
                className="cursor-pointer"
              >
                <div className="flex gap-2">
                  <div className={cn(
                    "flex-1 px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors bg-sky-50 hover:bg-sky-100"
                  )}>
                    {selectedChain?.name_kr || '-'}
                  </div>
                  <div className={cn(
                    "flex-1 px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors bg-sky-50 hover:bg-sky-100"
                  )}>
                    {selectedChain?.name_en || '-'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className={cn(
                  "flex-1 px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors",
                  highlightedFields.has('chain_field') ? "bg-yellow-100" : "bg-gray-50"
                )}>
                  {selectedChain?.name_kr || '-'}
                </div>
                <div className={cn(
                  "flex-1 px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors",
                  highlightedFields.has('chain_field') ? "bg-yellow-100" : "bg-gray-50"
                )}>
                  {selectedChain?.name_en || '-'}
                </div>
              </div>
            )}
          </div>

          {/* 브랜드 정보 */}
          <div className="space-y-1 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">브랜드 정보</label>
            {isEditMode ? (
              <div 
                onClick={() => setIsChainBrandPickerOpen(true)}
                className="cursor-pointer"
              >
                <div className="flex gap-2">
                  <div className={cn(
                    "flex-1 px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors bg-sky-50 hover:bg-sky-100"
                  )}>
                    {selectedBrand?.name_kr || '-'}
                  </div>
                  <div className={cn(
                    "flex-1 px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors bg-sky-50 hover:bg-sky-100"
                  )}>
                    {selectedBrand?.name_en || '-'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className={cn(
                  "flex-1 px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors",
                  highlightedFields.has('brand_field') ? "bg-yellow-100" : "bg-gray-50"
                )}>
                  {selectedBrand?.name_kr || '-'}
                </div>
                <div className={cn(
                  "flex-1 px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors",
                  highlightedFields.has('brand_field') ? "bg-yellow-100" : "bg-gray-50"
                )}>
                  {selectedBrand?.name_en || '-'}
                </div>
              </div>
            )}
          </div>
            
          {/* Rate Plan Codes */}
          <div className="space-y-1 md:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Rate Plan Codes</label>
            {isEditMode ? (
              <RatePlanCodesEditor
                value={formData.rate_plan_codes}
                onChange={(codes) => {
                  setFormData(prev => ({ ...prev, rate_plan_codes: codes }))
                }}
                disabled={false}
              />
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
      </div>

      {/* 주소 및 위치 정보 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">주소 및 위치 정보</h3>
        <div className="space-y-6">
          {/* 호텔 주소 */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">호텔 주소</label>
            {isEditMode ? (
              <input
                type="text"
                name="property_address"
                value={formData.property_address}
                onChange={(e) => handleInputChange('property_address', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="호텔 주소"
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
              <label className="block text-sm font-medium text-gray-700">도시</label>
              {isEditMode ? (
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
              <label className="block text-sm font-medium text-gray-700">국가</label>
              {isEditMode ? (
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
              <label className="block text-sm font-medium text-gray-700">대륙</label>
              {isEditMode ? (
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
              <label className="block text-sm font-medium text-gray-700">지역</label>
              {isEditMode ? (
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
  )

  // 혜택 탭 콘텐츠
  const BenefitsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">호텔 혜택 관리</h3>
          <BenefitsAddButton />
        </div>
        <BenefitsManager 
          initial={mappedBenefits || []}
        />
      </div>
    </div>
  )

  // 체인 브랜드 관리 탭 콘텐츠
  const ChainBrandTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">체인/브랜드 관리</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-md font-medium text-gray-900">현재 연결된 체인/브랜드</h4>
              <p className="text-sm text-gray-600 mt-1">
                {selectedChain?.name_kr && selectedBrand?.name_kr 
                  ? `${selectedChain.name_kr} - ${selectedBrand.name_kr}`
                  : '연결된 체인/브랜드가 없습니다.'
                }
              </p>
            </div>
            <Button
              onClick={() => setIsChainBrandPickerOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {selectedChain && selectedBrand ? '변경' : '연결'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  // 이미지 관리 탭 콘텐츠
  const ImagesTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">이미지 관리</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">이미지 관리 기능이 곧 추가됩니다.</p>
        </div>
      </div>
    </div>
  )

  // 호텔 소개 글 탭 콘텐츠
  const ContentTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">호텔 소개 글</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">호텔 소개 글 관리 기능이 곧 추가됩니다.</p>
        </div>
      </div>
    </div>
  )

  // 아티클 탭 콘텐츠
  const ArticlesTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">아티클 관리</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">아티클 관리 기능이 곧 추가됩니다.</p>
        </div>
      </div>
    </div>
  )

  // 탭 아이템 정의
  const tabItems = [
    {
      id: 'basic',
      label: '기본 정보',
      content: <BasicInfoTab />
    },
    {
      id: 'benefits',
      label: '혜택 관리',
      content: <BenefitsTab />
    },
    {
      id: 'chain-brand',
      label: '체인/브랜드',
      content: <ChainBrandTab />
    },
    {
      id: 'images',
      label: '이미지 관리',
      content: <ImagesTab />
    },
    {
      id: 'content',
      label: '호텔 소개',
      content: <ContentTab />
    },
    {
      id: 'articles',
      label: '아티클',
      content: <ArticlesTab />
    }
  ]

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

      {/* 탭 구조 */}
      <div className="space-y-6">
        {/* 편집 모드 토글 버튼 */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            호텔 정보 {isEditMode ? '편집' : '조회'}
          </h2>
          <div className="flex gap-2">
            {isEditMode ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={toggleEditMode}
                  disabled={isPending}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isPending ? '저장 중...' : '저장'}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={toggleEditMode}
                className="bg-blue-600 hover:bg-blue-700"
              >
                편집
              </Button>
            )}
          </div>
        </div>

        {/* 탭 컴포넌트 */}
        <Tabs items={tabItems} defaultActiveTab="basic" />
      </div>

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