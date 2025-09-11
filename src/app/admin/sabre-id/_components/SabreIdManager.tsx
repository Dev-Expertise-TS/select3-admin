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

interface HotelDetailsResponse {
  success: boolean
  data?: {
    HotelDetailsInfo?: {
      HotelInfo?: HotelInfo
    }
    // 기존 구조도 지원
    sabre_id?: string
    property_name_ko?: string
    property_name_en?: string
    [key: string]: any
  }
  error?: string
}

interface SabreHotelResponse {
  success: boolean
  data?: HotelInfo | {
    HotelDetailsInfo?: {
      HotelInfo?: HotelInfo
    }
    [key: string]: any
  }
  error?: string
}

export default function SabreIdManager() {
  const [sabreId, setSabreId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hotelInfo, setHotelInfo] = useState<HotelInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

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
        // 실제 Sabre API 응답 구조 (GetHotelDetailsRS.HotelDetailsInfo.HotelInfo) 처리
        if (typeof data.data === 'object' && 'GetHotelDetailsRS' in data.data && data.data.GetHotelDetailsRS?.HotelDetailsInfo?.HotelInfo) {
          setHotelInfo(data.data.GetHotelDetailsRS.HotelDetailsInfo.HotelInfo)
        }
        // 백업 구조 (HotelDetailsInfo.HotelInfo) 처리
        else if (typeof data.data === 'object' && 'HotelDetailsInfo' in data.data && data.data.HotelDetailsInfo?.HotelInfo) {
          setHotelInfo(data.data.HotelDetailsInfo.HotelInfo)
        }
        // 직접 HotelInfo 객체인 경우
        else if (typeof data.data === 'object' && ('HotelName' in data.data || 'SabreHotelCode' in data.data)) {
          setHotelInfo(data.data as HotelInfo)
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
            <h2 className="text-lg font-semibold">Sabre ID 검색</h2>
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
    </div>
  )
}