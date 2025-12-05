'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { RegionType } from '@/types/regions'

interface RegionOption {
  id: number
  code: string | null
  name_ko: string | null
  name_en: string | null
}

interface RegionSelectorProps {
  regionType: RegionType
  value: {
    ko: string
    en: string
    code?: string
  }
  onChange: (value: { ko: string; en: string; code: string | null }) => void
  disabled?: boolean
}

export function RegionSelector({ regionType, value, onChange, disabled }: RegionSelectorProps) {
  const [options, setOptions] = useState<RegionOption[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  console.log(`[RegionSelector] 렌더링됨 - regionType: ${regionType}, disabled: ${disabled}, isOpen: ${isOpen}, optionsCount: ${options.length}`);

  // 지역 옵션 로드
  useEffect(() => {
    const fetchRegions = async () => {
      setLoading(true)
      try {
        console.log(`[RegionSelector] 옵션 로드 시작 - regionType: ${regionType}`);
        const response = await fetch(`/api/regions?type=${regionType}&pageSize=500`)
        const data = await response.json()
        
        console.log(`[RegionSelector] API 응답:`, { success: data.success, count: data.data?.length });
        
        if (data.success && Array.isArray(data.data)) {
          const formattedOptions: RegionOption[] = data.data.map((item: any) => {
            let code = null
            let name_ko = null
            let name_en = null
            
            if (regionType === 'city') {
              code = item.city_code
              name_ko = item.city_ko
              name_en = item.city_en
            } else if (regionType === 'country') {
              code = item.country_code
              name_ko = item.country_ko
              name_en = item.country_en
            } else if (regionType === 'continent') {
              code = item.continent_code
              name_ko = item.continent_ko
              name_en = item.continent_en
            } else if (regionType === 'region') {
              code = item.region_code
              name_ko = item.region_name_ko
              name_en = item.region_name_en
            }
            
            const opt: RegionOption = {
              id: item.id,
              code,
              name_ko,
              name_en
            }
            return opt
          }).filter((opt: RegionOption) => opt.name_ko || opt.name_en) // 이름이 있는 것만

          // 한글 이름 기준 가나다 정렬 (없으면 영문명 기준)
          formattedOptions.sort((a, b) => {
            const aName = a.name_ko || a.name_en || ''
            const bName = b.name_ko || b.name_en || ''
            return aName.localeCompare(bName, 'ko-KR')
          })

          console.log(`[RegionSelector] 옵션 정렬 완료 - 총 ${formattedOptions.length}개`);
          setOptions(formattedOptions)
        }
      } catch (error) {
        console.error('[RegionSelector] Failed to fetch regions:', error)
      }
      setLoading(false)
    }

    fetchRegions()
  }, [regionType])

  const handleSelect = (option: RegionOption) => {
    onChange({
      ko: option.name_ko || '',
      en: option.name_en || '',
      code: option.code
    })
    setIsOpen(false)
  }

  const displayValue = () => {
    if (!value.ko && !value.en) {
      return <span className="text-gray-500">{regionType} 선택</span>
    }
    
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-gray-900">{value.ko || value.en}</span>
        {value.ko && value.en && (
          <span className="text-gray-500">/ {value.en}</span>
        )}
        {value.code && (
          <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">[{value.code}]</span>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`[RegionSelector] 버튼 클릭됨 - regionType: ${regionType}, disabled: ${disabled}, isOpen: ${isOpen}`);
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        disabled={disabled}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-left focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-between"
      >
        {displayValue()}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsOpen(false)}
          />

          {/* 레이어 팝업 */}
          <div
            className="relative z-50 w-full max-w-xl max-h-[70vh] bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                {regionType === 'city' && '도시 선택'}
                {regionType === 'country' && '국가 선택'}
                {regionType === 'continent' && '대륙 선택'}
                {regionType === 'region' && '지역 선택'}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-6 text-sm text-gray-500 text-center">
                  로딩 중...
                </div>
              ) : options.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500 text-center">
                  옵션이 없습니다.
                </div>
              ) : (
                <>
                  {/* 선택 해제 옵션 */}
                  <div
                    onClick={() => {
                      onChange({ ko: '', en: '', code: null })
                      setIsOpen(false)
                    }}
                    className="px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 text-gray-500"
                  >
                    선택 해제
                  </div>

                  {options.map((option, index) => (
                    <div
                      key={`${option.id}-${option.code ?? ''}-${option.name_ko ?? option.name_en ?? ''}-${index}`}
                      onClick={() => handleSelect(option)}
                      className="px-4 py-3 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-50 last:border-0"
                    >
                      <div className="font-medium text-gray-900 flex items-center justify-between gap-2">
                        <span>{option.name_ko || option.name_en}</span>
                        {option.code && (
                          <span className="ml-2 text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                            {option.code}
                          </span>
                        )}
                      </div>
                      {option.name_ko && option.name_en && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          {option.name_en}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

