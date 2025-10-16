'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Database, Filter } from 'lucide-react'

interface Hotel {
  sabre_id: string
  property_name_ko: string | null
  property_name_en: string | null
  rate_plan_code: string[] | null
  brand_id: number | null
  city_ko: string | null
  country_ko: string | null
}

type RatePlanFilter = 'all' | 'has_codes' | 'no_codes' | 'specific_code'
type BrandIdFilter = 'all' | 'has_brand' | 'no_brand'
type CountryFilter = 'all' | 'has_country' | 'no_country'

export function HotelsTable() {
  const [ratePlanFilter, setRatePlanFilter] = useState<RatePlanFilter>('all')
  const [specificCode, setSpecificCode] = useState('')
  const [brandIdFilter, setBrandIdFilter] = useState<BrandIdFilter>('all')
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('all')
  const [searchInput, setSearchInput] = useState('')

  // 호텔 목록 조회 (전체 데이터를 가져와서 클라이언트에서 필터링)
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['hotels-list'],
    queryFn: async () => {
      const params = new URLSearchParams({
        rate_plan_filter: 'all', // 모든 데이터를 가져옴
      })

      const url = `/api/hotels/list?${params.toString()}`
      console.log('🔍 호텔 목록 조회 요청 (전체):', url)
      
      const res = await fetch(url)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '호텔 목록 조회 실패')
      }
      
      const result = await res.json()
      console.log('📦 API 응답:', result)
      console.log('📊 데이터 개수:', result.data?.length || 0)
      
      return result
    },
  })

  const hotels: Hotel[] = useMemo(() => {
    const data = response?.data || []
    
    // 디버깅: 첫 3개 호텔의 rate_plan_code 확인
    if (data.length > 0) {
      console.log('🔍 클라이언트: 받은 호텔 데이터 샘플 (처음 3개)')
      data.slice(0, 3).forEach((hotel, idx) => {
        console.log(`호텔 ${idx + 1}:`, {
          sabre_id: hotel.sabre_id,
          property_name_ko: hotel.property_name_ko,
          rate_plan_code: hotel.rate_plan_code,
          rate_plan_code_type: typeof hotel.rate_plan_code,
          rate_plan_code_isArray: Array.isArray(hotel.rate_plan_code),
        })
      })
    }
    
    return data
  }, [response])

  // 로컬 검색 및 필터 (모든 필터를 AND 조건으로 적용)
  const filteredHotels = useMemo(() => {
    let result = [...hotels]

    // Rate Plan Code 필터 적용
    if (ratePlanFilter === 'has_codes') {
      result = result.filter((hotel) => {
        const codes = hotel.rate_plan_code
        return codes !== null && Array.isArray(codes) && codes.length > 0
      })
    } else if (ratePlanFilter === 'no_codes') {
      result = result.filter((hotel) => {
        const codes = hotel.rate_plan_code
        return codes === null || !Array.isArray(codes) || codes.length === 0
      })
    } else if (ratePlanFilter === 'specific_code' && specificCode.trim()) {
      result = result.filter((hotel) => {
        const codes = hotel.rate_plan_code
        return Array.isArray(codes) && codes.some((code) => 
          code.toLowerCase().includes(specificCode.toLowerCase())
        )
      })
    }

    // Brand ID 필터 적용
    if (brandIdFilter === 'has_brand') {
      result = result.filter((hotel) => hotel.brand_id !== null)
    } else if (brandIdFilter === 'no_brand') {
      result = result.filter((hotel) => hotel.brand_id === null)
    }

    // 국가 필터 적용
    if (countryFilter === 'has_country') {
      result = result.filter((hotel) => hotel.country_ko !== null && hotel.country_ko.trim() !== '')
    } else if (countryFilter === 'no_country') {
      result = result.filter((hotel) => hotel.country_ko === null || hotel.country_ko.trim() === '')
    }

    // 검색어 필터 적용
    if (searchInput.trim()) {
      const search = searchInput.toLowerCase()
      result = result.filter((hotel) => 
        String(hotel.sabre_id || '').toLowerCase().includes(search) ||
        hotel.property_name_ko?.toLowerCase().includes(search) ||
        hotel.property_name_en?.toLowerCase().includes(search) ||
        hotel.city_ko?.toLowerCase().includes(search) ||
        hotel.country_ko?.toLowerCase().includes(search) ||
        (Array.isArray(hotel.rate_plan_code) && hotel.rate_plan_code.some((code) => code.toLowerCase().includes(search)))
      )
    }

    return result
  }, [hotels, ratePlanFilter, specificCode, brandIdFilter, countryFilter, searchInput])

  const handleFilterChange = (newFilter: RatePlanFilter) => {
    setRatePlanFilter(newFilter)
    if (newFilter !== 'specific_code') {
      setSpecificCode('')
    }
  }

  const handleSpecificCodeSearch = () => {
    if (specificCode.trim()) {
      setRatePlanFilter('specific_code')
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">
          ❌ 오류: {error instanceof Error ? error.message : '알 수 없는 오류'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 필터 컨트롤 */}
      <div className="rounded-lg border bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">필터 옵션</h3>
          </div>
          {(ratePlanFilter !== 'all' || brandIdFilter !== 'all' || countryFilter !== 'all' || searchInput) && (
            <button
              onClick={() => {
                setRatePlanFilter('all')
                setSpecificCode('')
                setBrandIdFilter('all')
                setCountryFilter('all')
                setSearchInput('')
              }}
              className="text-xs px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              전체 초기화
            </button>
          )}
        </div>

        {/* Rate Plan Code 필터 */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Rate Plan Code 필터
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleFilterChange('all')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                ratePlanFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              전체
            </button>
            <button
              onClick={() => handleFilterChange('has_codes')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                ratePlanFilter === 'has_codes'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              코드 있음
            </button>
            <button
              onClick={() => handleFilterChange('no_codes')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                ratePlanFilter === 'no_codes'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              코드 없음
            </button>
          </div>

          {/* 특정 코드 검색 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={specificCode}
              onChange={(e) => setSpecificCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSpecificCodeSearch()
                }
              }}
              placeholder="특정 Rate Plan Code 검색 (예: ZZZBARC)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSpecificCodeSearch}
              disabled={!specificCode.trim()}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                specificCode.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              검색
            </button>
          </div>
        </div>

        {/* Brand ID 필터 */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Brand ID 필터
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setBrandIdFilter('all')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                brandIdFilter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              전체
            </button>
            <button
              onClick={() => setBrandIdFilter('has_brand')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                brandIdFilter === 'has_brand'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              브랜드 있음
            </button>
            <button
              onClick={() => setBrandIdFilter('no_brand')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                brandIdFilter === 'no_brand'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              브랜드 없음
            </button>
          </div>
        </div>

        {/* 국가 필터 */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            국가 필터
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCountryFilter('all')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                countryFilter === 'all'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              전체
            </button>
            <button
              onClick={() => setCountryFilter('has_country')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                countryFilter === 'has_country'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              국가 있음
            </button>
            <button
              onClick={() => setCountryFilter('no_country')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                countryFilter === 'no_country'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              국가 없음
            </button>
          </div>
        </div>

        {/* 테이블 검색 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            테이블 내 검색
          </label>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Sabre ID, 호텔명, 지역, 국가 등으로 검색..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 통계 정보 */}
      <div className="rounded-lg border bg-blue-50 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {isLoading ? '로딩 중...' : `총 ${filteredHotels.length.toLocaleString()}개 호텔`}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {brandIdFilter !== 'all' && (
              <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                {brandIdFilter === 'has_brand' ? '브랜드 있음' : '브랜드 없음'}
              </span>
            )}
            {countryFilter !== 'all' && (
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                {countryFilter === 'has_country' ? '국가 있음' : '국가 없음'}
              </span>
            )}
            {searchInput && (
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                검색: {searchInput}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 데이터 테이블 */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Sabre ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  호텔명 (한글)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  호텔명 (영문)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Rate Plan Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Brand ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  도시
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  국가
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : filteredHotels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    {searchInput ? '검색 결과가 없습니다.' : '표시할 호텔이 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredHotels.map((hotel, index) => (
                  <tr key={`${hotel.sabre_id}-${index}`} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {hotel.sabre_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {hotel.property_name_ko || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {hotel.property_name_en || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {(() => {
                        const codes = hotel.rate_plan_code
                        
                        // 디버깅: 각 호텔의 rate_plan_code 값 출력 (처음 5개만)
                        if (index < 5) {
                          console.log(`🔍 렌더링 - 호텔 ${hotel.sabre_id}:`, {
                            rate_plan_code: codes,
                            type: typeof codes,
                            isArray: Array.isArray(codes),
                            length: Array.isArray(codes) ? codes.length : 'N/A'
                          })
                        }
                        
                        // null 또는 undefined 체크
                        if (codes === null || codes === undefined) {
                          return <span className="text-gray-400">-</span>
                        }
                        
                        // 배열인 경우
                        if (Array.isArray(codes)) {
                          if (codes.length === 0) {
                            return <span className="text-gray-400 text-xs">(빈 배열)</span>
                          }
                          return (
                            <div className="flex flex-wrap gap-1">
                              {codes.map((code, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {code}
                                </span>
                              ))}
                            </div>
                          )
                        }
                        
                        // 문자열인 경우 (콤마로 구분되어 있을 수 있음)
                        if (typeof codes === 'string') {
                          if (codes.trim() === '') {
                            return <span className="text-gray-400 text-xs">(빈 문자열)</span>
                          }
                          const codeArray = codes.split(',').map(c => c.trim()).filter(Boolean)
                          if (codeArray.length > 0) {
                            return (
                              <div className="flex flex-wrap gap-1">
                                {codeArray.map((code, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800"
                                  >
                                    {code}
                                  </span>
                                ))}
                              </div>
                            )
                          }
                        }
                        
                        // 기타 타입
                        return (
                          <span className="text-orange-600 text-xs">
                            (예상치 못한 타입: {typeof codes})
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {hotel.brand_id !== null ? hotel.brand_id : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {hotel.city_ko || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {hotel.country_ko || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

