'use client'

import React from 'react'
import Link from 'next/link'
import { BenefitsManager, type BenefitRow as BBRow } from '@/features/hotels/components/benefits-manager'
import { BenefitsAddButton } from '@/features/hotels/components/benefits-add-button'
import { ChainBrandPicker, type Chain, type Brand } from '@/features/hotels/components/chain-brand-picker'
import { Button } from '@/components/ui/button'

import { cn } from '@/lib/utils'

interface Props {
  initialData: Record<string, unknown>
  mappedBenefits: BBRow[]
}

export function HotelEditForm({ initialData, mappedBenefits }: Props) {
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const formRef = React.useRef<HTMLFormElement>(null)

  // 폼 데이터 상태 관리
  const [formData, setFormData] = React.useState({
    sabre_id: String(initialData.sabre_id ?? ''),
    property_name_ko: String(initialData.property_name_ko ?? ''),
    property_name_en: String(initialData.property_name_en ?? '')
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
    // 초기 데이터에서 체인 정보 설정 (hotel_chains 테이블에서 조회된 실제 데이터)
    if (initialData.hotel_chains) {
      const chains = initialData.hotel_chains as Record<string, unknown> | null
      
      // 디버깅: selectedChain 초기화 과정
      const sabreId = String(initialData.sabre_id ?? '')
      if (sabreId === '313016') {
        console.log('=== selectedChain 초기화 디버깅 ===')
        console.log('initialData.hotel_chains:', chains)
        console.log('chains가 존재하는가?', !!chains)
        if (chains) {
          console.log('chains.chain_id:', chains.chain_id)
          console.log('chains.name_kr:', chains.name_kr)
          console.log('chains.name_en:', chains.name_en)
        }
        console.log('===============================')
      }
      
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
    // 초기 데이터에서 브랜드 정보 설정
    const brands = initialData.hotel_brands as Record<string, unknown> | null
    
    // 디버깅: selectedBrand 초기화 과정
    const sabreId = String(initialData.sabre_id ?? '')
    if (sabreId === '313016') {
      console.log('=== selectedBrand 초기화 디버깅 ===')
      console.log('initialData.hotel_brands:', brands)
      console.log('brands가 존재하는가?', !!brands)
      if (brands) {
        console.log('brands.brand_id:', brands.brand_id)
        console.log('brands.chain_id:', brands.chain_id)
        console.log('brands.name_kr:', brands.name_kr)
        console.log('brands.name_en:', brands.name_en)
      }
      console.log('===============================')
    }
    
    return brands ? {
      brand_id: Number(brands.brand_id ?? 0),
      chain_id: Number(brands.chain_id ?? 0) || null,
      name_kr: String(brands.name_kr ?? ''),
      name_en: String(brands.name_en ?? '')
    } : null
  })

  // 디버깅: Sabre ID 313016인 경우 brand_id 값 콘솔에 출력
  React.useEffect(() => {
    const sabreId = String(initialData.sabre_id ?? '')
    if (sabreId === '313016') {
      console.log('=== Sabre ID 313016 호텔 정보 ===')
      console.log('전체 initialData:', initialData)
      console.log('초기 brand_id 값:', initialData.brand_id)
      console.log('현재 currentBrandId:', currentBrandId)
      console.log('destination_sort 값:', initialData.destination_sort)
      console.log('hotel_brands 데이터:', initialData.hotel_brands)
      console.log('hotel_chains 데이터:', initialData.hotel_chains)
      console.log('selectedChain:', selectedChain)
      console.log('selectedBrand:', selectedBrand)
      console.log('==================================')
    }
  }, [initialData, currentBrandId, selectedChain, selectedBrand])
  
  const toggleEditMode = () => {
    setIsEditMode(prev => {
      if (prev) {
        // 편집 모드 종료 시 원본 데이터로 복원 및 하이라이트 초기화
        setFormData({
          sabre_id: String(initialData.sabre_id ?? ''),
          property_name_ko: String(initialData.property_name_ko ?? ''),
          property_name_en: String(initialData.property_name_en ?? '')
        })
        setHighlightedFields(new Set())
      }
      return !prev
    })
  }

  const handleSave = async (submitFormData: FormData) => {
    setIsLoading(true)
    
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

      // FormData에 현재 상태 값들을 추가 (편집 모드가 아닐 때를 위해)
      if (!isEditMode) {
        submitFormData.set('sabre_id_editable', formData.sabre_id)
        submitFormData.set('property_name_ko', formData.property_name_ko)
        submitFormData.set('property_name_en', formData.property_name_en)
      }
      
      // 체인/브랜드 정보를 FormData에 추가
      // 현재 선택된 브랜드 ID 사용
      if (currentBrandId) {
        submitFormData.set('brand_id', String(currentBrandId))
        // 브랜드가 선택된 경우, 브랜드의 chain_id도 함께 저장
        if (selectedBrand?.chain_id) {
          submitFormData.set('chain_id', String(selectedBrand.chain_id))
        } else {
          submitFormData.set('chain_id', '') // null 대신 빈 문자열
        }
      } else if (selectedChain?.chain_id) {
        // 체인만 선택된 경우 (브랜드 없음)
        submitFormData.set('chain_id', String(selectedChain.chain_id))
        submitFormData.set('brand_id', '') // null 대신 빈 문자열
      } else {
        // 둘 다 선택 해제된 경우
        submitFormData.set('chain_id', '')
        submitFormData.set('brand_id', '')
      }

      // 디버깅: Sabre ID 313016인 경우 FormData 전송 내용 확인
      const sabreId = String(initialData.sabre_id ?? '')
      if (sabreId === '313016') {
        console.log('=== 클라이언트 FormData 전송 내용 ===')
        console.log('currentBrandId:', currentBrandId)
        console.log('selectedBrand:', selectedBrand)
        console.log('selectedChain:', selectedChain)
        console.log('FormData에 설정된 brand_id:', submitFormData.get('brand_id'))
        console.log('FormData에 설정된 chain_id:', submitFormData.get('chain_id'))
        console.log('==============================')
      }

      // 변경된 필드 추적 (초기값과 비교)
      const changedFields: string[] = []
      
      if (sabreIdEditable !== String(initialData.sabre_id ?? '')) {
        changedFields.push('input[name="sabre_id_editable"]')
      }
      if (property_name_ko !== String(initialData.property_name_ko ?? '')) {
        changedFields.push('input[name="property_name_ko"]')
      }
      if (property_name_en !== String(initialData.property_name_en ?? '')) {
        changedFields.push('input[name="property_name_en"]')
      }
      
      // 체인/브랜드 변경 감지는 아래에서 처리

      // API를 통해 서버에 데이터 전송
      const response = await fetch('/api/hotel/update', {
        method: 'POST',
        body: submitFormData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`서버 오류 (${response.status}): ${errorText}`)
      }

      const result = await response.json().catch(() => {
        throw new Error('서버 응답을 파싱할 수 없습니다.')
      })
      
      if (!result.success) {
        throw new Error(result.error || '저장에 실패했습니다.')
      }

      // 상태 업데이트 - 현재 값들을 그대로 유지
      setFormData({
        sabre_id: sabreIdEditable || formData.sabre_id,
        property_name_ko: property_name_ko || formData.property_name_ko,
        property_name_en: property_name_en || formData.property_name_en
      })

      // 체인/브랜드 상태도 업데이트 (저장된 값으로)
      if (result.data) {
        // API 응답에서 체인/브랜드 정보 확인
        if (sabreId === '313016') {
          console.log('=== API 응답 데이터 ===')
          console.log('result.data:', result.data)
          console.log('저장된 chain_id:', result.data.chain_id)
          console.log('저장된 brand_id:', result.data.brand_id)
        }
        
        // 저장된 brand_id가 있다면 해당 브랜드 정보 조회
        if (result.data.brand_id) {
          try {
            const brandResponse = await fetch(`/api/chain-brand/list`)
            if (brandResponse.ok) {
              const brandData = await brandResponse.json()
              if (brandData.success && brandData.data.brands) {
                const savedBrand = brandData.data.brands.find((b: Record<string, unknown>) => b.brand_id === result.data.brand_id)
                if (savedBrand) {
                  setSelectedBrand(savedBrand)
                  setCurrentBrandId(savedBrand.brand_id)
                  
                  // 브랜드의 체인 정보도 조회
                  if (savedBrand.chain_id) {
                    const savedChain = brandData.data.chains.find((c: Record<string, unknown>) => c.chain_id === savedBrand.chain_id)
                    if (savedChain) {
                      setSelectedChain(savedChain)
                    }
                  }
                  
                  if (sabreId === '313016') {
                    console.log('저장 후 브랜드 상태 업데이트:', savedBrand)
                  }
                }
              }
            }
          } catch (error) {
            console.error('저장 후 브랜드 정보 조회 오류:', error)
          }
        } else {
          // brand_id가 없다면 체인/브랜드 선택 해제
          setSelectedBrand(null)
          setSelectedChain(null)
          setCurrentBrandId(null)
          
          if (sabreId === '313016') {
            console.log('체인/브랜드 선택 해제됨')
          }
        }
      }

      // 편집 모드 상태를 저장 (모드 변경 전에)
      const wasInEditMode = isEditMode
      
      // 편집 모드 종료
      setIsEditMode(false)

      // 편집 모드였을 때만 기본 정보 필드 변경 검사 (혜택만 변경한 경우 제외)
      const fieldNames = new Set<string>()
      
      if (wasInEditMode) {
        // 편집 모드에서 저장한 경우에만 변경 감지
        const initialSabreId = String(initialData.sabre_id ?? '')
        const initialPropertyNameKo = String(initialData.property_name_ko ?? '')
        const initialPropertyNameEn = String(initialData.property_name_en ?? '')
        
        const currentSabreId = String(sabreIdEditable ?? '')
        const currentPropertyNameKo = String(property_name_ko ?? '')
        const currentPropertyNameEn = String(property_name_en ?? '')
        
        if (initialSabreId !== currentSabreId) {
          fieldNames.add('sabre_id')
        }
        if (initialPropertyNameKo !== currentPropertyNameKo) {
          fieldNames.add('property_name_ko')
        }
        if (initialPropertyNameEn !== currentPropertyNameEn) {
          fieldNames.add('property_name_en')
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
    } finally {
      setIsLoading(false)
    }
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
        <Link href="/admin/hotel-update" className="text-blue-600 hover:underline">← 목록으로 돌아가기</Link>
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
              {/* 디버깅 정보 */}
              {String(initialData.sabre_id ?? '') === '313016' && (
                <div className="text-xs text-gray-400 mt-1">
                  선택된 체인: {selectedChain ? `${selectedChain.chain_id} (${selectedChain.name_kr})` : '없음'}
                  <br />
                  hotel_chains 데이터: {initialData.hotel_chains ? '있음' : '없음'}
                </div>
              )}
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
              {/* 디버깅 정보 */}
              {String(initialData.sabre_id ?? '') === '313016' && (
                <div className="text-xs text-gray-400 mt-1">
                  선택된 브랜드: {selectedBrand ? `${selectedBrand.brand_id} (${selectedBrand.name_kr})` : '없음'}
                  <br />
                  currentBrandId: {currentBrandId || 'null'}
                </div>
              )}
            </div>
            
            {/* Rate Plan Codes */}
            <div className="space-y-1 md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700">Rate Plan Codes (rate_plan_code 컬럼)</label>
              <div className="w-full px-3 py-2 text-sm bg-gray-50 rounded-md border border-gray-200">
                {Array.isArray(initialData.rate_plan_code) 
                  ? (initialData.rate_plan_code as string[]).join(', ') || '-'
                  : '-'
                }
              </div>
              <input type="hidden" name="rate_plan_code" value={Array.isArray(initialData.rate_plan_code) ? (initialData.rate_plan_code as string[]).join(', ') : ''} />
              {/* 디버깅 정보 */}
              {String(initialData.sabre_id ?? '') === '313016' && (
                <div className="text-xs text-gray-400 mt-1">
                  rate_plan_code: {Array.isArray(initialData.rate_plan_code) ? initialData.rate_plan_code.join(', ') : '없음'}
                </div>
              )}
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
            disabled={isLoading}
            className={cn(
              "bg-blue-600 text-white hover:bg-blue-700",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? '저장 중...' : '저장'}
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
