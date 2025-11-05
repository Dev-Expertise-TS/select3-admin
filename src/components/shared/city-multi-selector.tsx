'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface City {
  id: number
  city_ko: string | null
  city_en: string | null
  city_code: string | null
  city_slug: string | null
}

interface CityMultiSelectorProps {
  value: string[] // 선택된 도시명들 (city_ko 또는 city_en)
  onChange: (cities: string[]) => void
  disabled?: boolean
}

export function CityMultiSelector({ value, onChange, disabled }: CityMultiSelectorProps) {
  const [cities, setCities] = useState<City[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // 도시 목록 로드
  useEffect(() => {
    const loadCities = async () => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/regions?type=city&pageSize=1000&status=active')
        if (!res.ok) throw new Error('도시 목록 조회 실패')
        const result = await res.json()
        if (result.success && result.data) {
          setCities(result.data)
        }
      } catch (error) {
        console.error('도시 목록 로드 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCities()
  }, [])

  // 필터된 도시 목록
  const filteredCities = cities.filter((city) => {
    const cityName = city.city_ko || city.city_en || ''
    const cityNameEn = city.city_en || ''
    const searchLower = searchTerm.toLowerCase()
    return (
      cityName.toLowerCase().includes(searchLower) ||
      cityNameEn.toLowerCase().includes(searchLower)
    )
  })

  // 도시 추가
  const handleAddCity = (city: City) => {
    const cityName = city.city_ko || city.city_en || ''
    if (!value.includes(cityName)) {
      onChange([...value, cityName])
    }
    setSearchTerm('')
    setIsOpen(false)
  }

  // 도시 제거
  const handleRemoveCity = (cityName: string) => {
    onChange(value.filter((c) => c !== cityName))
  }

  return (
    <div className="space-y-2">
      {/* 선택된 도시 목록 */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((cityName) => (
            <div
              key={cityName}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              <span>{cityName}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveCity(cityName)}
                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 검색 및 선택 */}
      {!disabled && (
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="도시 검색..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />

          {/* 드롭다운 */}
          {isOpen && searchTerm && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCities.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    검색 결과가 없습니다.
                  </div>
                ) : (
                  filteredCities.slice(0, 50).map((city) => {
                    const cityName = city.city_ko || city.city_en || ''
                    const isSelected = value.includes(cityName)
                    return (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => handleAddCity(city)}
                        disabled={isSelected}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                          isSelected ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''
                        }`}
                      >
                        <div className="font-medium">{city.city_ko}</div>
                        {city.city_en && (
                          <div className="text-xs text-gray-500">{city.city_en}</div>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

