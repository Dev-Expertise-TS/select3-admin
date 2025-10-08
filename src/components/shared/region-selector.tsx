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

  // 지역 옵션 로드
  useEffect(() => {
    const fetchRegions = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/regions?type=${regionType}&pageSize=500`)
        const data = await response.json()
        
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
            
            return {
              id: item.id,
              code,
              name_ko,
              name_en
            }
          }).filter((opt: RegionOption) => opt.name_ko || opt.name_en) // 이름이 있는 것만
          
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
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-left focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-between"
      >
        {displayValue()}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <>
          {/* 배경 오버레이 */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          
          {/* 드롭다운 */}
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">로딩 중...</div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">옵션이 없습니다.</div>
            ) : (
              <>
                {/* 선택 해제 옵션 */}
                <div
                  onClick={() => {
                    onChange({ ko: '', en: '', code: null })
                    setIsOpen(false)
                  }}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 text-gray-500"
                >
                  선택 해제
                </div>
                
                {options.map((option) => (
                  <div
                    key={option.id}
                    onClick={() => handleSelect(option)}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-50 last:border-0"
                  >
                    <div className="font-medium text-gray-900">
                      {option.name_ko || option.name_en}
                      {option.code && (
                        <span className="ml-2 text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                          {option.code}
                        </span>
                      )}
                    </div>
                    {option.name_ko && option.name_en && (
                      <div className="text-xs text-gray-600 mt-0.5">{option.name_en}</div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

