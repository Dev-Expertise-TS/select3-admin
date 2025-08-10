'use client'

import React from 'react'
import Link from 'next/link'
import { BenefitsManager, type BenefitRow as BBRow } from '@/features/hotels/components/benefits-manager'
import { BenefitsAddButton } from '@/features/hotels/components/benefits-add-button'
import { ChainBrandPicker, type Chain, type Brand } from '@/features/hotels/components/chain-brand-picker'
import { Button } from '@/components/ui/button'
import { highlightFields } from '@/components/shared/field-highlight'
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
    property_name_kor: String(initialData.property_name_kor ?? ''),
    property_name_eng: String(initialData.property_name_eng ?? '')
  })

  // 하이라이트된 필드 추적
  const [highlightedFields, setHighlightedFields] = React.useState<Set<string>>(new Set())
  
  // 체인/브랜드 선택 팝업 상태
  const [isChainBrandPickerOpen, setIsChainBrandPickerOpen] = React.useState(false)
  const [selectedChain, setSelectedChain] = React.useState<Chain | null>(() => {
    // 브랜드의 chain_id를 기반으로 체인 정보 설정
    const chains = initialData.hotel_chains as Record<string, unknown> | null
    return chains ? {
      chain_id: Number(chains.chain_id ?? 0),
      chain_code: String(chains.chain_code ?? ''),
      name_kr: String(chains.name_kr ?? ''),
      name_en: String(chains.name_en ?? '')
    } : null
  })
  const [selectedBrand, setSelectedBrand] = React.useState<Brand | null>(() => {
    const brands = initialData.hotel_brands as Record<string, unknown> | null
    return brands ? {
      brand_id: Number(brands.brand_id ?? 0),
      brand_code: String(brands.brand_code ?? ''),
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
          property_name_kor: String(initialData.property_name_kor ?? ''),
          property_name_eng: String(initialData.property_name_eng ?? '')
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
      const property_name_kor = isEditMode 
        ? (submitFormData.get('property_name_kor') as string | null) ?? null
        : formData.property_name_kor
      const property_name_eng = isEditMode 
        ? (submitFormData.get('property_name_eng') as string | null) ?? null
        : formData.property_name_eng

      // FormData에 현재 상태 값들을 추가 (편집 모드가 아닐 때를 위해)
      if (!isEditMode) {
        submitFormData.set('sabre_id_editable', formData.sabre_id)
        submitFormData.set('property_name_kor', formData.property_name_kor)
        submitFormData.set('property_name_eng', formData.property_name_eng)
      }
      
      // 체인/브랜드 정보를 FormData에 추가
      // 브랜드가 선택된 경우, 브랜드의 chain_id를 사용
      if (selectedBrand?.brand_id) {
        submitFormData.set('brand_id', String(selectedBrand.brand_id))
        // 브랜드의 chain_id도 함께 저장 (브랜드가 선택되면 체인도 자동으로 결정됨)
        if (selectedBrand.chain_id) {
          submitFormData.set('chain_id', String(selectedBrand.chain_id))
        }
      } else if (selectedChain?.chain_id) {
        // 체인만 선택된 경우 (브랜드 없음)
        submitFormData.set('chain_id', String(selectedChain.chain_id))
        submitFormData.delete('brand_id') // 브랜드 정보 제거
      } else {
        // 둘 다 선택 해제된 경우
        submitFormData.delete('chain_id')
        submitFormData.delete('brand_id')
      }

      // 변경된 필드 추적 (초기값과 비교)
      const changedFields: string[] = []
      
      if (sabreIdEditable !== String(initialData.sabre_id ?? '')) {
        changedFields.push('input[name="sabre_id_editable"]')
      }
      if (property_name_kor !== String(initialData.property_name_kor ?? '')) {
        changedFields.push('input[name="property_name_kor"]')
      }
      if (property_name_eng !== String(initialData.property_name_eng ?? '')) {
        changedFields.push('input[name="property_name_eng"]')
      }

      // API를 통해 서버에 데이터 전송
      const response = await fetch('/api/hotel/update', {
        method: 'POST',
        body: submitFormData
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || '저장에 실패했습니다.')
      }

      // 상태 업데이트 - 현재 값들을 그대로 유지
      setFormData({
        sabre_id: sabreIdEditable || formData.sabre_id,
        property_name_kor: property_name_kor || formData.property_name_kor,
        property_name_eng: property_name_eng || formData.property_name_eng
      })

      // 편집 모드 상태를 저장 (모드 변경 전에)
      const wasInEditMode = isEditMode
      
      // 편집 모드 종료
      setIsEditMode(false)

      // 편집 모드였을 때만 기본 정보 필드 변경 검사 (혜택만 변경한 경우 제외)
      const fieldNames = new Set<string>()
      
      if (wasInEditMode) {
        // 편집 모드에서 저장한 경우에만 변경 감지
        const initialSabreId = String(initialData.sabre_id ?? '')
        const initialPropertyNameKor = String(initialData.property_name_kor ?? '')
        const initialPropertyNameEng = String(initialData.property_name_eng ?? '')
        
        const currentSabreId = String(sabreIdEditable ?? '')
        const currentPropertyNameKor = String(property_name_kor ?? '')
        const currentPropertyNameEng = String(property_name_eng ?? '')
        
        if (initialSabreId !== currentSabreId) {
          fieldNames.add('sabre_id')
        }
        if (initialPropertyNameKor !== currentPropertyNameKor) {
          fieldNames.add('property_name_kor')
        }
        if (initialPropertyNameEng !== currentPropertyNameEng) {
          fieldNames.add('property_name_eng')
        }
      }
      // 편집 모드가 아니었다면 (혜택만 변경) 기본 정보 필드는 하이라이트하지 않음
      
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
    setSelectedChain(chain)
    setSelectedBrand(brand)
    
    // 브랜드가 선택되면 해당 브랜드의 체인으로 체인 정보도 업데이트
    if (brand && chain && brand.chain_id === chain.chain_id) {
      setSelectedChain(chain)
    } else if (brand && !chain) {
      // 브랜드만 선택된 경우, 체인 정보는 API에서 자동으로 설정될 것이므로 여기서는 처리하지 않음
    }
  }

  // 체인/브랜드 필드 클릭 핸들러
  const handleChainBrandClick = () => {
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
                  name="property_name_kor" 
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-sky-50 transition-colors duration-300" 
                  value={formData.property_name_kor}
                  onChange={(e) => handleInputChange('property_name_kor', e.target.value)}
                />
              ) : (
                <div className={cn(
                  "w-full px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors duration-300",
                  highlightedFields.has('property_name_kor') ? "bg-yellow-100" : "bg-gray-50"
                )}>
                  {formData.property_name_kor || '-'}
                </div>
              )}
            </div>
            
            {/* 호텔명(영문) */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">호텔명(영문)</label>
              {isEditMode ? (
                <input 
                  name="property_name_eng" 
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-sky-50 transition-colors duration-300" 
                  value={formData.property_name_eng}
                  onChange={(e) => handleInputChange('property_name_eng', e.target.value)}
                />
              ) : (
                <div className={cn(
                  "w-full px-3 py-2 text-sm rounded-md border border-gray-200 transition-colors duration-300",
                  highlightedFields.has('property_name_eng') ? "bg-yellow-100" : "bg-gray-50"
                )}>
                  {formData.property_name_eng || '-'}
                </div>
              )}
            </div>
            
            {/* 체인 */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">체인</label>
              <div 
                className="flex gap-2 cursor-pointer" 
                onClick={handleChainBrandClick}
                title="클릭하여 체인/브랜드 선택"
              >
                <div className="flex-1 px-3 py-2 text-sm bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors">
                  {selectedChain?.name_kr || '-'}
                </div>
                <div className="flex-1 px-3 py-2 text-sm bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors">
                  {selectedChain?.name_en || '-'}
                </div>
              </div>
            </div>
            
            {/* 브랜드 */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">브랜드</label>
              <div 
                className="flex gap-2 cursor-pointer" 
                onClick={handleChainBrandClick}
                title="클릭하여 체인/브랜드 선택"
              >
                <div className="flex-1 px-3 py-2 text-sm bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors">
                  {selectedBrand?.name_kr || '-'}
                </div>
                <div className="flex-1 px-3 py-2 text-sm bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors">
                  {selectedBrand?.name_en || '-'}
                </div>
              </div>
            </div>
            
            {/* Rate Plan Codes */}
            <div className="space-y-1 md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700">Rate Plan Codes (콤마 구분)</label>
              <div className="w-full px-3 py-2 text-sm bg-gray-50 rounded-md border border-gray-200">
                {Array.isArray(initialData.rate_plan_codes) 
                  ? (initialData.rate_plan_codes as string[]).join(', ') || '-'
                  : '-'
                }
              </div>
              <input type="hidden" name="rate_plan_codes" value={Array.isArray(initialData.rate_plan_codes) ? (initialData.rate_plan_codes as string[]).join(', ') : ''} />
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
