'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Database, Filter, Edit } from 'lucide-react'

interface Hotel {
  sabre_id: string
  property_name_ko: string | null
  property_name_en: string | null
  rate_plan_code: string[] | null
  brand_id: number | null
  brand_id_2: number | null
  brand_name_ko: string | null
  brand_id_2_name_ko: string | null
  city_ko: string | null
  country_ko: string | null
  vcc: boolean | null
}

type RatePlanFilter = 'all' | 'has_codes' | 'no_codes' | 'specific_code'
type BrandIdFilter = 'all' | 'has_brand_1' | 'no_brand_1' | 'has_brand_2' | 'no_brand_2'
type CountryFilter = 'all' | 'has_country' | 'no_country'
type VccFilter = 'all' | 'vcc_true' | 'vcc_false'

export function HotelsTable() {
  const router = useRouter()
  const [ratePlanFilter, setRatePlanFilter] = useState<RatePlanFilter>('all')
  const [specificCode, setSpecificCode] = useState('')
  const [brandIdFilter, setBrandIdFilter] = useState<BrandIdFilter>('all')
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('all')
  const [vccFilter, setVccFilter] = useState<VccFilter>('all')
  const [searchInput, setSearchInput] = useState('')
  const [ratePlanCodes, setRatePlanCodes] = useState<string[]>([])
  const [isRatePlanDropdownOpen, setIsRatePlanDropdownOpen] = useState(false)
  const ratePlanInputRef = useRef<HTMLInputElement>(null)
  const ratePlanDropdownRef = useRef<HTMLDivElement>(null)

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

  // Rate Plan Code 목록 로드
  useEffect(() => {
    const fetchRatePlanCodes = async () => {
      try {
        const res = await fetch('/api/rate-plan-codes')
        if (!res.ok) throw new Error('Rate Plan Code 목록 조회 실패')
        const result = await res.json()
        if (result.success && Array.isArray(result.data)) {
          setRatePlanCodes(result.data)
        }
      } catch (error) {
        console.error('Rate Plan Code 목록 로드 오류:', error)
      }
    }

    fetchRatePlanCodes()
  }, [])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        ratePlanInputRef.current &&
        ratePlanDropdownRef.current &&
        !ratePlanInputRef.current.contains(event.target as Node) &&
        !ratePlanDropdownRef.current.contains(event.target as Node)
      ) {
        setIsRatePlanDropdownOpen(false)
      }
    }

    if (isRatePlanDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isRatePlanDropdownOpen])

  // Rate Plan Code 유효성 검사 헬퍼 함수
  const hasRatePlanCodes = (codes: string[] | string | null | undefined): boolean => {
    if (codes === null || codes === undefined) return false
    if (Array.isArray(codes)) return codes.length > 0
    if (typeof codes === 'string') return codes.trim().length > 0
    return false
  }

  // 필터된 Rate Plan Code 목록
  const filteredRatePlanCodes = useMemo(() => {
    if (!specificCode.trim()) return ratePlanCodes
    const searchLower = specificCode.toLowerCase()
    return ratePlanCodes.filter((code) => code.toLowerCase().includes(searchLower))
  }, [ratePlanCodes, specificCode])

  // Rate Plan Code 선택 핸들러
  const handleRatePlanCodeSelect = (code: string) => {
    setSpecificCode(code)
    setIsRatePlanDropdownOpen(false)
    setRatePlanFilter('specific_code')
  }

  // 로컬 검색 및 필터 (모든 필터를 AND 조건으로 적용)
  const filteredHotels = useMemo(() => {
    let result = [...hotels]

    // Rate Plan Code 필터 적용
    if (ratePlanFilter === 'has_codes') {
      result = result.filter((hotel) => hasRatePlanCodes(hotel.rate_plan_code))
    } else if (ratePlanFilter === 'no_codes') {
      result = result.filter((hotel) => !hasRatePlanCodes(hotel.rate_plan_code))
    } else if (ratePlanFilter === 'specific_code' && specificCode.trim()) {
      result = result.filter((hotel) => {
        const codes = hotel.rate_plan_code
        if (Array.isArray(codes)) {
          return codes.some((code) => 
            code.toLowerCase().includes(specificCode.toLowerCase())
          )
        }
        if (typeof codes === 'string') {
          return codes.toLowerCase().includes(specificCode.toLowerCase())
        }
        return false
      })
    }

    // Brand ID 필터 적용
    if (brandIdFilter === 'has_brand_1') {
      result = result.filter((hotel) => hotel.brand_id !== null)
    } else if (brandIdFilter === 'no_brand_1') {
      result = result.filter((hotel) => hotel.brand_id === null)
    } else if (brandIdFilter === 'has_brand_2') {
      result = result.filter((hotel) => hotel.brand_id_2 !== null)
    } else if (brandIdFilter === 'no_brand_2') {
      result = result.filter((hotel) => hotel.brand_id_2 === null)
    }

    // 국가 필터 적용
    if (countryFilter === 'has_country') {
      result = result.filter((hotel) => hotel.country_ko !== null && hotel.country_ko.trim() !== '')
    } else if (countryFilter === 'no_country') {
      result = result.filter((hotel) => hotel.country_ko === null || hotel.country_ko.trim() === '')
    }

    // VCC 필터 적용
    if (vccFilter === 'vcc_true') {
      result = result.filter((hotel) => hotel.vcc === true)
    } else if (vccFilter === 'vcc_false') {
      result = result.filter((hotel) => hotel.vcc !== true)
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
  }, [hotels, ratePlanFilter, specificCode, brandIdFilter, countryFilter, vccFilter, searchInput])

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
          {(ratePlanFilter !== 'all' || brandIdFilter !== 'all' || countryFilter !== 'all' || vccFilter !== 'all' || searchInput) && (
            <button
              onClick={() => {
                setRatePlanFilter('all')
                setSpecificCode('')
                setBrandIdFilter('all')
                setCountryFilter('all')
                setVccFilter('all')
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
            <div className="relative flex-1">
              <input
                ref={ratePlanInputRef}
                type="text"
                value={specificCode}
                onChange={(e) => {
                  setSpecificCode(e.target.value)
                  setIsRatePlanDropdownOpen(true)
                }}
                onFocus={() => {
                  if (ratePlanCodes.length > 0) {
                    setIsRatePlanDropdownOpen(true)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSpecificCodeSearch()
                    setIsRatePlanDropdownOpen(false)
                  } else if (e.key === 'Escape') {
                    setIsRatePlanDropdownOpen(false)
                  }
                }}
                placeholder="특정 Rate Plan Code 검색 (예: ZZZBARC)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* 드롭다운 */}
              {isRatePlanDropdownOpen && filteredRatePlanCodes.length > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsRatePlanDropdownOpen(false)}
                  />
                  <div
                    ref={ratePlanDropdownRef}
                    className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                  >
                    {filteredRatePlanCodes.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleRatePlanCodeSelect(code)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
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
              onClick={() => setBrandIdFilter('has_brand_1')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                brandIdFilter === 'has_brand_1'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              브랜드 1 있음
            </button>
            <button
              onClick={() => setBrandIdFilter('no_brand_1')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                brandIdFilter === 'no_brand_1'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              브랜드 1 없음
            </button>
            <button
              onClick={() => setBrandIdFilter('has_brand_2')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                brandIdFilter === 'has_brand_2'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              브랜드 2 있음
            </button>
            <button
              onClick={() => setBrandIdFilter('no_brand_2')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                brandIdFilter === 'no_brand_2'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              브랜드 2 없음
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

        {/* VCC 필터 */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            VCC 필터
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setVccFilter('all')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                vccFilter === 'all'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              전체
            </button>
            <button
              onClick={() => setVccFilter('vcc_true')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                vccFilter === 'vcc_true'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              VCC 사용
            </button>
            <button
              onClick={() => setVccFilter('vcc_false')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                vccFilter === 'vcc_false'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              VCC 미사용
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
                {brandIdFilter === 'has_brand_1' ? '브랜드 1 있음' :
                 brandIdFilter === 'no_brand_1' ? '브랜드 1 없음' :
                 brandIdFilter === 'has_brand_2' ? '브랜드 2 있음' :
                 '브랜드 2 없음'}
              </span>
            )}
            {countryFilter !== 'all' && (
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                {countryFilter === 'has_country' ? '국가 있음' : '국가 없음'}
              </span>
            )}
            {vccFilter !== 'all' && (
              <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">
                {vccFilter === 'vcc_true' ? 'VCC 사용' : 'VCC 미사용'}
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-64">
                  호텔명 (한글)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-64">
                  호텔명 (영문)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Rate Plan Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                  BRAND
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                  BRAND_2
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  도시
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  국가
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  VCC
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">
                  편집
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : filteredHotels.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                    {searchInput ? '검색 결과가 없습니다.' : '표시할 호텔이 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredHotels.map((hotel, index) => (
                  <tr key={`${hotel.sabre_id}-${index}`} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {hotel.sabre_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 w-64 max-w-64 truncate" title={hotel.property_name_ko || ''}>
                      {hotel.property_name_ko || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 w-64 max-w-64 truncate" title={hotel.property_name_en || ''}>
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
                    <td className="px-4 py-3 text-sm text-gray-900 w-32 max-w-32 truncate" title={hotel.brand_name_ko || ''}>
                      {hotel.brand_name_ko || (hotel.brand_id !== null ? String(hotel.brand_id) : '-')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 w-32 max-w-32 truncate" title={hotel.brand_id_2_name_ko || ''}>
                      {hotel.brand_id_2_name_ko || (hotel.brand_id_2 !== null ? String(hotel.brand_id_2) : '-')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {hotel.city_ko || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {hotel.country_ko || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {hotel.vcc === true ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          사용
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => router.push(`/admin/hotel-update/${hotel.sabre_id}`)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        title="호텔 상세 편집"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
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

