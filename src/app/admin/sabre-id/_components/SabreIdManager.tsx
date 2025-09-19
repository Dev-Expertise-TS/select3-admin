'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Loader2, CheckCircle, AlertCircle, Building2, MapPin, Globe } from 'lucide-react'

interface HotelInfo {
  HotelCode?: string
  CodeContext?: string
  HotelName?: string
  ChainCode?: string
  ChainName?: string
  BrandCode?: string
  BrandName?: string
  SabreRating?: string
  SabreHotelCode?: string
  // 기존 필드들도 유지 (호환성)
  sabreId?: string
  hotelName?: string
  propertyNameKo?: string
  propertyNameEn?: string
  address?: string
  city?: string
  country?: string
  chainName?: string
  brandName?: string
  phone?: string
  email?: string
  website?: string
  description?: string
}

// interface HotelDetailsResponse {
//   success: boolean
//   data?: {
//     HotelDetailsInfo?: {
//       HotelInfo?: HotelInfo
//     }
//     // 기존 구조도 지원
//     sabre_id?: string
//     property_name_ko?: string
//     property_name_en?: string
//     [key: string]: unknown
//   }
//   error?: string
// }

interface SabreHotelResponse {
  success: boolean
  data?: HotelInfo | {
    HotelDetailsInfo?: {
      HotelInfo?: HotelInfo
    }
    [key: string]: unknown
  }
  error?: string
}

export default function SabreIdManager() {
  // Sabre API 검색 관련 state
  const [sabreId, setSabreId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hotelInfo, setHotelInfo] = useState<HotelInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  // DB 검색 관련 state
  const [dbSearchTerm, setDbSearchTerm] = useState('')
  const [dbSearchLoading, setDbSearchLoading] = useState(false)
  const [dbSearchResults, setDbSearchResults] = useState<unknown[]>([])
  const [dbSearchError, setDbSearchError] = useState<string | null>(null)

  // DB 검색 함수
  const handleDbSearch = async () => {
    if (!dbSearchTerm.trim()) {
      setDbSearchError('검색어를 입력해주세요.')
      return
    }

    setDbSearchLoading(true)
    setDbSearchError(null)
    setDbSearchResults([])

    try {
      const response = await fetch(`/api/sabre/db-search?q=${encodeURIComponent(dbSearchTerm.trim())}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'DB 검색이 실패했습니다.')
      }

      if (data.success && data.data) {
        setDbSearchResults(data.data)
      } else {
        throw new Error(data.error || '검색 결과를 찾을 수 없습니다.')
      }
    } catch (err) {
      setDbSearchError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.')
    } finally {
      setDbSearchLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!sabreId.trim()) {
      setError('Sabre ID를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError(null)
    setWarning(null)
    setHotelInfo(null)

    try {
      const response = await fetch(`/api/sabre/hotel-details?sabre_id=${encodeURIComponent(sabreId.trim())}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      const data: SabreHotelResponse = await response.json()
      
      // 디버깅을 위한 로그
      console.log('API 응답 상태:', response.status)
      console.log('API 응답 데이터:', data)

      if (!response.ok) {
        throw new Error(data.error || 'API 요청이 실패했습니다.')
      }

      if (data.success && data.data) {
        const responseData = data.data as Record<string, unknown>
        
        // 실제 Sabre API 응답 구조 (GetHotelDetailsRS.HotelDetailsInfo.HotelInfo) 처리
        if (typeof responseData === 'object' && 'GetHotelDetailsRS' in responseData) {
          const getHotelDetailsRS = responseData.GetHotelDetailsRS as Record<string, unknown>
          if (getHotelDetailsRS && typeof getHotelDetailsRS === 'object' && 'HotelDetailsInfo' in getHotelDetailsRS) {
            const hotelDetailsInfo = getHotelDetailsRS.HotelDetailsInfo as Record<string, unknown>
            if (hotelDetailsInfo && typeof hotelDetailsInfo === 'object' && 'HotelInfo' in hotelDetailsInfo) {
              setHotelInfo(hotelDetailsInfo.HotelInfo as HotelInfo)
            }
          }
        }
        // 백업 구조 (HotelDetailsInfo.HotelInfo) 처리
        else if (typeof responseData === 'object' && 'HotelDetailsInfo' in responseData) {
          const hotelDetailsInfo = responseData.HotelDetailsInfo as Record<string, unknown>
          if (hotelDetailsInfo && typeof hotelDetailsInfo === 'object' && 'HotelInfo' in hotelDetailsInfo) {
            setHotelInfo(hotelDetailsInfo.HotelInfo as HotelInfo)
          }
        }
        // 직접 HotelInfo 객체인 경우
        else if (typeof responseData === 'object' && ('HotelName' in responseData || 'SabreHotelCode' in responseData)) {
          setHotelInfo(responseData as HotelInfo)
        }
        else {
          console.error('예상치 못한 응답 구조:', data.data)
          throw new Error('호텔 정보 형식이 올바르지 않습니다.')
        }
        
        // 경고 메시지가 있으면 표시
        if (data.error) {
          setWarning(data.error)
        }
      } else {
        throw new Error(data.error || '호텔 정보를 찾을 수 없습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch()
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="space-y-6 p-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Sabre API 기준 Sabre ID 검색</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <Input
                type="text"
                placeholder="Sabre ID를 입력하세요 (예: 12345)"
                value={sabreId}
                onChange={(e) => setSabreId(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="h-10"
              />
              <Button 
                onClick={handleSearch}
                disabled={isLoading || !sabreId.trim()}
                className="h-10 px-8"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    검색중
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    검색
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {warning && (
              <div className="flex items-start gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div>{warning}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {hotelInfo && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="border-b p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">호텔 정보</h3>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* 기본 정보 */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">Sabre Hotel Code</h4>
                <div className="text-2xl font-bold text-blue-600 font-mono">
                  {hotelInfo.SabreHotelCode || hotelInfo.sabreId || '-'}
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">Hotel Code</h4>
                <div className="text-lg font-semibold text-gray-900 font-mono">
                  {hotelInfo.HotelCode || '-'}
                </div>
                {hotelInfo.CodeContext && (
                  <div className="text-xs text-gray-500">
                    컨텍스트: {hotelInfo.CodeContext}
                  </div>
                )}
              </div>
            </div>

            {/* 호텔명 및 등급 */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">호텔명</h4>
                <div className="text-xl font-semibold text-gray-900">
                  {hotelInfo.HotelName || hotelInfo.propertyNameEn || hotelInfo.hotelName || '-'}
                </div>
              </div>
              
              {hotelInfo.SabreRating && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-500">Sabre 등급</h4>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-yellow-600">
                      {hotelInfo.SabreRating}
                    </div>
                    <div className="text-sm text-gray-500">
                      / 5.0
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 한글 호텔명 */}
            {hotelInfo.propertyNameKo && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">호텔명 (한글)</h4>
                <div className="text-lg font-semibold text-gray-900">
                  {hotelInfo.propertyNameKo}
                </div>
              </div>
            )}

            {/* 체인/브랜드 정보 */}
            {(hotelInfo.ChainName || hotelInfo.BrandName || hotelInfo.chainName || hotelInfo.brandName) && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">체인/브랜드</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {(hotelInfo.ChainName || hotelInfo.chainName) && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-xs text-gray-500">체인</span>
                        <div className="text-sm font-medium text-gray-900">
                          {hotelInfo.ChainName || hotelInfo.chainName}
                        </div>
                        {hotelInfo.ChainCode && (
                          <div className="text-xs text-gray-500 font-mono">
                            코드: {hotelInfo.ChainCode}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {(hotelInfo.BrandName || hotelInfo.brandName) && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-xs text-gray-500">브랜드</span>
                        <div className="text-sm font-medium text-gray-900">
                          {hotelInfo.BrandName || hotelInfo.brandName}
                        </div>
                        {hotelInfo.BrandCode && (
                          <div className="text-xs text-gray-500 font-mono">
                            코드: {hotelInfo.BrandCode}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 주소 정보 */}
            {(hotelInfo.address || hotelInfo.city || hotelInfo.country) && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">주소 정보</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  {hotelInfo.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <span className="text-xs text-gray-500">주소</span>
                        <div className="text-sm text-gray-900 mt-1">
                          {hotelInfo.address}
                        </div>
                      </div>
                    </div>
                  )}
                  {hotelInfo.city && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <span className="text-xs text-gray-500">도시</span>
                        <div className="text-sm text-gray-900 mt-1">
                          {hotelInfo.city}
                        </div>
                      </div>
                    </div>
                  )}
                  {hotelInfo.country && (
                    <div className="flex items-start gap-2">
                      <Globe className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <span className="text-xs text-gray-500">국가</span>
                        <div className="text-sm text-gray-900 mt-1">
                          {hotelInfo.country}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 연락처 정보 */}
            {(hotelInfo.phone || hotelInfo.email || hotelInfo.website) && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">연락처 정보</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  {hotelInfo.phone && (
                    <div>
                      <span className="text-xs text-gray-500">전화번호</span>
                      <div className="text-sm text-gray-900 mt-1">
                        {hotelInfo.phone}
                      </div>
                    </div>
                  )}
                  {hotelInfo.email && (
                    <div>
                      <span className="text-xs text-gray-500">이메일</span>
                      <div className="text-sm text-gray-900 mt-1">
                        {hotelInfo.email}
                      </div>
                    </div>
                  )}
                  {hotelInfo.website && (
                    <div>
                      <span className="text-xs text-gray-500">웹사이트</span>
                      <div className="text-sm text-gray-900 mt-1">
                        <a 
                          href={hotelInfo.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {hotelInfo.website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 호텔 설명 */}
            {hotelInfo.description && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">호텔 설명</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {hotelInfo.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-blue-50 p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <Search className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-blue-900">Sabre ID 검색 시스템</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>직접 검색:</strong> Sabre ID를 입력하여 호텔 정보를 직접 조회합니다</p>
              <p>• <strong>실시간 데이터:</strong> Sabre API를 통해 최신 호텔 정보를 가져옵니다</p>
              <p>• <strong>상세 정보:</strong> 호텔명, 주소, 연락처 등 상세 정보를 제공합니다</p>
            </div>
          </div>
        </div>
      </div>

      {/* DB 검색 영역 */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="space-y-6 p-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold">DB 기준 Sabre 호텔 및 ID 검색</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <Input
                type="text"
                placeholder="호텔명 또는 Sabre ID를 입력하세요"
                value={dbSearchTerm}
                onChange={(e) => setDbSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !dbSearchLoading) {
                    handleDbSearch()
                  }
                }}
                disabled={dbSearchLoading}
                className="h-10"
              />
              <Button 
                onClick={handleDbSearch}
                disabled={dbSearchLoading || !dbSearchTerm.trim()}
                className="h-10 px-8 bg-green-600 hover:bg-green-700"
              >
                {dbSearchLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    검색 중...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    DB 검색
                  </>
                )}
              </Button>
            </div>

            {/* DB 검색 에러 메시지 */}
            {dbSearchError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium">검색 오류</h3>
                  <p className="text-sm mt-1">{dbSearchError}</p>
                </div>
              </div>
            )}

            {/* DB 검색 결과 */}
            {dbSearchResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900">
                    검색 결과 ({dbSearchResults.length}개)
                  </h3>
                </div>
                
                <div className="grid gap-4">
                  {dbSearchResults.map((hotelData, index) => {
                    const hotel = hotelData as Record<string, unknown>
                    return (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Sabre ID</h4>
                            <p className="text-lg font-bold text-blue-600 font-mono">
                              {(hotel.sabre_id as string) || '-'}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">호텔명 (영문)</h4>
                            <p className="text-base font-semibold text-gray-900">
                              {(hotel.property_name_en as string) || '-'}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">호텔명 (한글)</h4>
                            <p className="text-base font-semibold text-gray-900">
                              {(hotel.property_name_ko as string) || '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 빈 결과 메시지 */}
            {!dbSearchLoading && dbSearchTerm && dbSearchResults.length === 0 && !dbSearchError && (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">검색 결과가 없습니다.</p>
                <p className="text-xs mt-1">다른 검색어로 시도해보세요.</p>
              </div>
            )}
          </div>

          {/* DB 검색 시스템 설명 */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900">DB 기준 검색 시스템</h3>
            <div className="text-sm text-green-800 space-y-1">
              <p>• <strong>로컬 DB 검색:</strong> Supabase 데이터베이스의 sabre_hotels 테이블에서 검색합니다</p>
              <p>• <strong>검색 대상:</strong> Sabre ID 및 호텔 영문명으로 검색 가능합니다</p>
              <p>• <strong>빠른 검색:</strong> 로컬 DB를 활용하여 빠른 검색 결과를 제공합니다</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}