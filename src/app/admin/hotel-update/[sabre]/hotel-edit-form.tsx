'use client'

import React, { useTransition, useCallback } from 'react'
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
  isNewHotel?: boolean
}

export function HotelEditForm({ initialData, mappedBenefits, isNewHotel = false }: Props) {
  const router = useRouter()
  const [isEditMode, setIsEditMode] = React.useState(isNewHotel)
  const formRef = React.useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [sabreIdCheck, setSabreIdCheck] = React.useState<{
    status: 'idle' | 'checking' | 'available' | 'exists' | 'error'
    message?: string
    checkedSabreId?: string
  }>({ status: 'idle' })

  // 폼 데이터 상태 관리
  const [formData, setFormData] = React.useState({
    sabre_id: String(initialData.sabre_id ?? ''),
    property_name_ko: String(initialData.property_name_ko ?? ''),
    property_name_en: String(initialData.property_name_en ?? ''),
    slug: String(initialData.slug ?? ''),
    publish: initialData.publish === true || initialData.publish === 'true',
    property_address: String(initialData.property_address ?? ''),
    area_code: String(initialData.area_code ?? ''),
    area_ko: String(initialData.area_ko ?? ''),
    area_en: String(initialData.area_en ?? ''),
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

  // Area 리스트 상태
  const [areaList, setAreaList] = React.useState<Array<{ id: number; area_ko: string | null; area_en: string | null }>>([])
  
  // Area 리스트 로드
  React.useEffect(() => {
    const loadAreas = async () => {
      try {
        const response = await fetch('/api/regions?type=area&pageSize=1000&status=active')
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          setAreaList(
            data.data
              .filter((r: any) => r.status === 'active' && (r.area_ko || r.area_en))
              .map((r: any) => ({
                id: r.id,
                area_ko: r.area_ko,
                area_en: r.area_en
              }))
          )
        }
      } catch (error) {
        console.error('Area 리스트 로드 실패:', error)
      }
    }
    loadAreas()
  }, [])

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
    // 신규 호텔 생성 모드에서는 편집 모드 토글 비활성화
    if (isNewHotel) return
    
    setIsEditMode(prev => {
      if (prev) {
        // 편집 모드 종료 시 원본 데이터로 복원 및 하이라이트 초기화
        setFormData({
          sabre_id: String(initialData.sabre_id ?? ''),
          property_name_ko: String(initialData.property_name_ko ?? ''),
          property_name_en: String(initialData.property_name_en ?? ''),
          slug: String(initialData.slug ?? ''),
          publish: initialData.publish === true || initialData.publish === 'true',
          property_address: String(initialData.property_address ?? ''),
          area_code: String(initialData.area_code ?? ''),
          area_ko: String(initialData.area_ko ?? ''),
          area_en: String(initialData.area_en ?? ''),
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

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleCheckSabreId = useCallback(async () => {
    const sabreIdInput = document.querySelector('input[name="sabre_id_editable"]') as HTMLInputElement
    const sabreId = (sabreIdInput?.value || formData.sabre_id || '').trim()

    if (!sabreId) {
      setSabreIdCheck({
        status: 'error',
        message: 'Sabre ID를 먼저 입력해주세요.',
      })
      return
    }

    setSabreIdCheck({ status: 'checking', checkedSabreId: sabreId })

    try {
      const res = await fetch(`/api/hotel/check-sabre-id?sabreId=${encodeURIComponent(sabreId)}`)
      const json = await res.json().catch(() => null)

      if (!res.ok) {
        setSabreIdCheck({
          status: 'error',
          checkedSabreId: sabreId,
          message: json?.error || `확인 중 오류가 발생했습니다. (status: ${res.status})`,
        })
        return
      }

      const exists = Boolean(json?.data?.exists)
      if (exists) {
        setSabreIdCheck({
          status: 'exists',
          checkedSabreId: sabreId,
          message: '이미 존재하는 아이디 입니다.',
        })
      } else {
        setSabreIdCheck({
          status: 'available',
          checkedSabreId: sabreId,
          message: '등록 가능',
        })
      }
    } catch (e) {
      setSabreIdCheck({
        status: 'error',
        checkedSabreId: sabreId,
        message: e instanceof Error ? e.message : '확인 중 오류가 발생했습니다.',
      })
    }
  }, [formData.sabre_id])

  // 체인/브랜드 변경 추적
  const [chainBrandChanged, setChainBrandChanged] = React.useState(false)
  const [chainBrandSaving, setChainBrandSaving] = React.useState(false)

  const handleChainBrandSelect = useCallback((chain: Chain | null, brand: Brand | null) => {
    setSelectedChain(chain)
    setSelectedBrand(brand)
    if (brand) {
      setCurrentBrandId(brand.brand_id)
          } else {
      setCurrentBrandId(null)
    }
    setIsChainBrandPickerOpen(false)
    setChainBrandChanged(true)
    
    // 체인/브랜드 변경 시 하이라이트
    setHighlightedFields(prev => new Set([...prev, 'chain_field', 'brand_field']))
  }, [])

  const handleSaveChainBrand = async () => {
    if (!chainBrandChanged) {
      alert('변경 사항이 없습니다.')
      return
    }

    setChainBrandSaving(true)
    try {
      const formDataToSubmit = new FormData()
      formDataToSubmit.append('sabre_id', formData.sabre_id)
      
      if (selectedBrand) {
        formDataToSubmit.append('brand_id', String(selectedBrand.brand_id))
      }

      const response = await fetch('/api/hotel/update-chain-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sabre_id: formData.sabre_id,
          brand_id: selectedBrand?.brand_id || null
        })
      })

      const result = await response.json()

      if (result.success) {
        setChainBrandChanged(false)
        alert('체인/브랜드 정보가 저장되었습니다.')
      } else {
        alert(result.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('체인/브랜드 저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setChainBrandSaving(false)
    }
  }

  const handleSave = async () => {
    if (!isEditMode) return

    // 비제어 컴포넌트의 현재 값을 DOM에서 수집
    const sabreIdInput = document.querySelector('input[name="sabre_id_editable"]') as HTMLInputElement
    const nameKoInput = document.querySelector('input[name="property_name_ko"]') as HTMLInputElement
    const nameEnInput = document.querySelector('input[name="property_name_en"]') as HTMLInputElement
    const slugInput = document.querySelector('input[name="slug"]') as HTMLInputElement

    // 현재 DOM 값으로 업데이트된 formData 생성
    const currentValues = {
      sabre_id: sabreIdInput?.value || formData.sabre_id,
      property_name_ko: nameKoInput?.value || formData.property_name_ko,
      property_name_en: nameEnInput?.value || formData.property_name_en,
      slug: slugInput?.value || formData.slug,
      publish: formData.publish  // 체크박스는 이미 상태로 관리됨
    }

    // 신규 호텔 생성 시 필수 필드 검증
    if (isNewHotel) {
      if (!currentValues.sabre_id.trim()) {
        alert('Sabre ID는 필수입니다.')
        return
      }
      if (!currentValues.property_name_ko.trim()) {
        alert('호텔명(한글)은 필수입니다.')
        return
      }
      if (!currentValues.property_name_en.trim()) {
        alert('호텔명(영문)은 필수입니다.')
        return
      }
    }

    startTransition(async () => {
      try {
        const formDataToSubmit = new FormData()
        
        // 원본 Sabre ID (URL에서 온 것)
        const originalSabreId = String(initialData.sabre_id ?? '')
        
        console.log('[handleSave] 저장 시작')
        console.log('[handleSave] 원본 Sabre ID:', originalSabreId)
        console.log('[handleSave] 변경된 Sabre ID:', currentValues.sabre_id)
        console.log('[handleSave] Sabre ID 변경됨?', currentValues.sabre_id !== originalSabreId)
        
        // 원본 sabre_id를 'sabre_id'로 전달 (비교용)
        formDataToSubmit.append('sabre_id', originalSabreId)
        // 변경된 sabre_id를 'sabre_id_editable'로 전달
        formDataToSubmit.append('sabre_id_editable', currentValues.sabre_id)
        
        formDataToSubmit.append('property_name_ko', currentValues.property_name_ko)
        formDataToSubmit.append('property_name_en', currentValues.property_name_en)
        formDataToSubmit.append('slug', currentValues.slug)
        formDataToSubmit.append('publish', String(currentValues.publish))
        formDataToSubmit.append('property_address', formData.property_address)
        formDataToSubmit.append('area_code', formData.area_code)
        formDataToSubmit.append('area_ko', formData.area_ko)
        formDataToSubmit.append('area_en', formData.area_en)
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

        // 신규 호텔 생성 시 is_new 플래그 추가
        if (isNewHotel) {
          formDataToSubmit.append('is_new', 'true')
        }

        const result = await updateHotel(formDataToSubmit)
        
        if (result.success) {
          if (isNewHotel) {
            // 신규 호텔 생성 성공 시 호텔 업데이트 페이지로 이동
            alert('신규 호텔이 생성되었습니다.')
            router.push(`/admin/hotel-update/${currentValues.sabre_id}`)
          } else {
            // Sabre ID 변경 시 새 페이지로 이동
            const originalSabreId = String(initialData.sabre_id ?? '')
            console.log('[handleSave] 저장 성공, 원본:', originalSabreId, '변경:', currentValues.sabre_id)
            
            if (currentValues.sabre_id !== originalSabreId) {
              alert(`Sabre ID가 변경되었습니다: ${originalSabreId} → ${currentValues.sabre_id}\n\n관련 데이터(혜택, 이미지)도 함께 마이그레이션되었습니다.`)
              router.push(`/admin/hotel-update/${currentValues.sabre_id}`)
            } else {
              // 기존 호텔 업데이트 성공 시 편집 모드 종료 및 하이라이트 초기화
              setIsEditMode(false)
            setHighlightedFields(new Set())
              
              // 현재 입력된 값으로 formData 업데이트 (저장된 값이 바로 보이도록)
              setFormData(prev => ({
                ...prev,
                sabre_id: currentValues.sabre_id,
                property_name_ko: currentValues.property_name_ko,
                property_name_en: currentValues.property_name_en,
                slug: currentValues.slug,
                publish: currentValues.publish
              }))
              
              alert('저장되었습니다.')
            }
          }
        } else {
          alert(result.error || '저장에 실패했습니다.')
          console.error('호텔 정보 업데이트 실패:', result.error)
        }
      } catch (error) {
        console.error('호텔 정보 업데이트 중 오류:', error)
      }
    })
  }


  // 기본 정보 탭 콘텐츠 (useCallback으로 메모이제이션)
  const BasicInfoTab = React.useCallback(() => (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Sabre ID */}
          <div className="space-y-1 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700">Sabre ID</label>
              {isEditMode ? (
                <>
                  <div className="flex items-center gap-2">
                    <input 
                      key="sabre_id_input"
                      type="text"
                      name="sabre_id_editable" 
                      defaultValue={formData.sabre_id}
                      onBlur={(e) => {
                        handleInputChange('sabre_id', e.target.value)
                        // 값이 바뀌면 이전 확인 결과는 무효화
                        setSabreIdCheck({ status: 'idle' })
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Sabre ID"
                    />

                    {isNewHotel && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleCheckSabreId}
                        disabled={sabreIdCheck.status === 'checking'}
                        className="whitespace-nowrap"
                      >
                        {sabreIdCheck.status === 'checking' ? '확인 중...' : 'Sabre Id 확인'}
                      </Button>
                    )}
                  </div>

                  {isNewHotel && sabreIdCheck.status !== 'idle' && (
                    <p
                      className={cn(
                        'text-xs mt-1',
                        sabreIdCheck.status === 'available' && 'text-green-700',
                        sabreIdCheck.status === 'exists' && 'text-red-700',
                        sabreIdCheck.status === 'error' && 'text-red-700',
                        sabreIdCheck.status === 'checking' && 'text-gray-600',
                      )}
                    >
                      {sabreIdCheck.message}
                      {sabreIdCheck.checkedSabreId ? ` (Sabre ID: ${sabreIdCheck.checkedSabreId})` : ''}
                    </p>
                  )}
                </>
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
                  defaultValue={formData.property_name_ko}
                  onBlur={(e) => handleInputChange('property_name_ko', e.target.value)}
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
                  defaultValue={formData.property_name_en}
                  onBlur={(e) => handleInputChange('property_name_en', e.target.value)}
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
            
          {/* Slug */}
          <div className="space-y-1 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Slug</label>
            {isEditMode ? (
              <input
                type="text"
                name="slug"
                defaultValue={formData.slug}
                onBlur={(e) => handleInputChange('slug', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="비우면 자동 생성됩니다"
              />
            ) : (
              <div className={cn(
                "w-full px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors duration-300",
                highlightedFields.has('slug') ? "bg-yellow-100" : "bg-gray-50"
              )}>
                {formData.slug || '-'}
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
          <div className="space-y-1 md:col-span-1">
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

          {/* Publish 상태 (스위치 형태) */}
          <div className="space-y-1 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">게시 상태</label>
            {isEditMode ? (
              <div className="flex items-center h-[42px]">
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.publish}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, publish: !prev.publish }))
                    setHighlightedFields(prev => new Set([...prev, 'publish']))
                  }}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    formData.publish ? "bg-green-600" : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      formData.publish ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
                <span className="ml-3 text-sm font-medium text-gray-700">
                  {formData.publish ? '공개' : '비공개'}
                </span>
              </div>
            ) : (
              <div className={cn(
                "w-full px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors duration-300 flex items-center",
                highlightedFields.has('publish') ? "bg-yellow-100" : "bg-gray-50"
              )}>
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                  formData.publish 
                    ? "bg-green-100 text-green-800" 
                    : "bg-gray-100 text-gray-800"
                )}>
                  {formData.publish ? '공개' : '비공개'}
                </span>
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

              {/* 호텔 지역 (Area) */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">호텔 지역</label>
                {isEditMode ? (
                  <select
                    name="area_code"
                    value={formData.area_code}
                    onChange={(e) => {
                      const selectedArea = areaList.find(a => String(a.id) === e.target.value)
                      setFormData(prev => ({
                        ...prev,
                        area_code: e.target.value,
                        area_ko: selectedArea?.area_ko ?? '',
                        area_en: selectedArea?.area_en ?? ''
                      }))
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">선택하세요</option>
                    {areaList.map((area) => (
                      <option key={area.id} value={String(area.id)}>
                        {area.area_ko || area.area_en || `ID: ${area.id}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    className={cn(
                      "w-full px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors duration-300",
                      highlightedFields.has('area_ko') || highlightedFields.has('area_code') ? "bg-yellow-100" : "bg-gray-50"
                    )}
                  >
                    {formData.area_ko || formData.area_en || '-'}
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
  ), [
    formData,
    isEditMode,
    highlightedFields,
    selectedChain,
    selectedBrand,
    handleInputChange,
    isNewHotel,
    handleCheckSabreId,
    sabreIdCheck.status,
    sabreIdCheck.message,
    sabreIdCheck.checkedSabreId,
  ])

  // 혜택 탭 콘텐츠
  const BenefitsTab = React.useCallback(() => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">호텔 혜택 관리</h3>
            <BenefitsAddButton />
        </div>
        <BenefitsManager 
          initial={mappedBenefits || []}
          sabreId={formData.sabre_id}
        />
      </div>
    </div>
  ), [mappedBenefits, formData.sabre_id])

  // 체인 브랜드 관리 탭 콘텐츠
  const ChainBrandTab = React.useCallback(() => (
    <div className="space-y-6">
      {chainBrandChanged && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ 변경 사항이 있습니다. 저장하려면 아래 버튼을 클릭하세요.
          </p>
        </div>
      )}
      
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
      
      {/* 저장 버튼 */}
      {chainBrandChanged && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSaveChainBrand}
            disabled={chainBrandSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {chainBrandSaving ? '저장 중...' : '변경 사항 저장'}
          </Button>
        </div>
      )}
    </div>
  ), [selectedChain, selectedBrand, chainBrandChanged, chainBrandSaving, handleChainBrandSelect, handleSaveChainBrand])

  // 이미지 관리 탭 콘텐츠
  const ImagesTab = React.useCallback(() => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">이미지 관리</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">이미지 관리 기능이 곧 추가됩니다.</p>
        </div>
      </div>
    </div>
  ), [])

  // 호텔 소개 글 탭 콘텐츠
  const ContentTab = React.useCallback(() => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">호텔 소개 글</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">호텔 소개 글 관리 기능이 곧 추가됩니다.</p>
        </div>
      </div>
    </div>
  ), [])

  // 아티클 탭 콘텐츠
  const ArticlesTab = React.useCallback(() => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">아티클 관리</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">아티클 관리 기능이 곧 추가됩니다.</p>
        </div>
      </div>
    </div>
  ), [])

  // 탭 아이템 정의
  const tabItems = [
    {
      id: 'basic',
      label: '기본 정보',
      // ⚠️ useCallback으로 만든 함수를 JSX 컴포넌트처럼 쓰면(<BasicInfoTab />)
      // 의존성 변경 시 언마운트/마운트가 발생할 수 있으므로, ReactNode로 "호출 결과"를 전달합니다.
      content: BasicInfoTab()
    },
    {
      id: 'benefits',
      label: '혜택 관리',
      content: BenefitsTab()
    },
    {
      id: 'chain-brand',
      label: '체인/브랜드',
      content: ChainBrandTab()
    },
    {
      id: 'images',
      label: '이미지 관리',
      content: ImagesTab()
    },
    {
      id: 'content',
      label: '호텔 소개',
      content: ContentTab()
    },
    {
      id: 'articles',
      label: '아티클',
      content: ArticlesTab()
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