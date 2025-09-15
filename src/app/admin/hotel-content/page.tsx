'use client'

import React, { useState } from 'react'
import { FileText, Save, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import HotelSearchWidget from '@/components/shared/hotel-search-widget'
import { AuthGuard } from '@/components/shared/auth-guard'

interface HotelContent {
  sabre_id: string
  property_name_ko: string | null
  property_name_en: string | null
  property_details: string | null
}

export default function HotelContentPage() {
  return (
    <AuthGuard requiredRole="admin">
      <HotelContentManager />
    </AuthGuard>
  )
}

function HotelContentManager() {
  const [selectedHotel, setSelectedHotel] = useState<HotelContent | null>(null)
  const [propertyDetails, setPropertyDetails] = useState('')
  const [wordpressUrl, setWordpressUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [extractSuccess, setExtractSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 호텔 선택 시 콜백
  const handleHotelSelect = async (sabreId: string | null) => {
    if (!sabreId) {
      setError('Sabre ID가 없는 호텔입니다.')
      return
    }

    setIsLoading(true)
    setError(null)
    setSelectedHotel(null)
    setPropertyDetails('')
    setWordpressUrl('')
    setExtractSuccess(false)

    try {
      const response = await fetch(`/api/hotel/content?sabre_id=${sabreId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '호텔 정보를 불러올 수 없습니다.')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || '호텔 정보를 불러올 수 없습니다.')
      }

      console.log('호텔 데이터:', data.data)
      console.log('property_details:', data.data.property_details)
      setSelectedHotel(data.data)
      setPropertyDetails(data.data.property_details || '')
    } catch (err) {
      console.error('호텔 정보 로딩 오류:', err)
      setError(err instanceof Error ? err.message : '호텔 정보를 불러올 수 없습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // WordPress 블로그 본문 추출
  const handleExtractContent = async () => {
    if (!selectedHotel?.sabre_id || !wordpressUrl.trim()) {
      setError('WordPress 블로그 URL을 입력해주세요.')
      return
    }

    setIsExtracting(true)
    setError(null)
    setExtractSuccess(false)

    try {
      const response = await fetch('/api/hotel/content/extract-wordpress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sabre_id: selectedHotel.sabre_id,
          wordpress_url: wordpressUrl.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '본문 추출에 실패했습니다.')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || '본문 추출에 실패했습니다.')
      }

      // 추출된 본문을 textarea에 설정
      setPropertyDetails(data.data.content || '')
      setExtractSuccess(true)
      
      // 3초 후 성공 메시지 숨기기
      setTimeout(() => {
        setExtractSuccess(false)
      }, 3000)

    } catch (err) {
      console.error('본문 추출 오류:', err)
      setError(err instanceof Error ? err.message : '본문 추출에 실패했습니다.')
    } finally {
      setIsExtracting(false)
    }
  }

  // property_details 저장
  const handleSave = async () => {
    if (!selectedHotel?.sabre_id) return

    setIsSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      const response = await fetch('/api/hotel/content', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sabre_id: selectedHotel.sabre_id,
          property_details: propertyDetails
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '저장에 실패했습니다.')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || '저장에 실패했습니다.')
      }

      setSaveSuccess(true)
      
      // 3초 후 성공 메시지 숨기기
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)

    } catch (err) {
      console.error('저장 오류:', err)
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-blue-600 p-2">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            호텔 콘텐츠 관리
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            호텔을 선택하고 property_details 콘텐츠를 편집하거나 WordPress 블로그에서 자동으로 추출하세요
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* 왼쪽: 호텔 검색 */}
        <div className="space-y-6">
          <HotelSearchWidget
            hideHeader={true}
            onHotelSelect={handleHotelSelect}
            enableHotelEdit={false}
            showInitialHotels={true}
          />
        </div>

        {/* 오른쪽: 콘텐츠 편집 */}
        <div className="lg:col-span-2 space-y-6">
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-4 text-blue-600 animate-spin" />
              <p className="text-gray-600">호텔 정보를 불러오는 중...</p>
            </div>
          ) : selectedHotel ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* 선택된 호텔 정보 */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">선택된 호텔</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Sabre ID:</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {selectedHotel.sabre_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">한글명:</span>
                    <span className="text-sm text-gray-900">
                      {selectedHotel.property_name_ko || '한글명 없음'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">영문명:</span>
                    <span className="text-sm text-gray-900">
                      {selectedHotel.property_name_en || '영문명 없음'}
                    </span>
                  </div>
                </div>
              </div>

              {/* WordPress 블로그 URL 입력 */}
              <div className="mb-6">
                <label htmlFor="wordpress-url" className="block text-sm font-medium text-gray-700 mb-2">
                  WordPress 블로그 URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    id="wordpress-url"
                    value={wordpressUrl}
                    onChange={(e) => setWordpressUrl(e.target.value)}
                    placeholder="https://example.com/blog-post"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleExtractContent}
                    disabled={isExtracting || !wordpressUrl.trim()}
                    className={cn(
                      "inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium",
                      "bg-green-600 text-white hover:bg-green-700",
                      "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600",
                      "transition-colors duration-200"
                    )}
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        추출 중...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        본문 추출
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  WordPress 블로그 URL을 입력하고 &quot;본문 추출&quot; 버튼을 클릭하면 자동으로 본문을 가져와 property_details에 설정합니다.
                </p>
                {extractSuccess && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    WordPress 블로그 본문을 성공적으로 추출했습니다
                  </div>
                )}
              </div>

              {/* Property Details 편집 */}
              <div className="mb-6">
                <label htmlFor="property-details" className="block text-sm font-medium text-gray-700 mb-2">
                  Property Details
                </label>
                <textarea
                  id="property-details"
                  value={propertyDetails}
                  onChange={(e) => setPropertyDetails(e.target.value)}
                  placeholder="Property details 콘텐츠를 입력하거나 WordPress 블로그에서 추출하세요..."
                  className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                />
                <p className="text-xs text-gray-500 mt-1">
                  호텔의 상세 정보, 설명, 특징 등을 텍스트로 편집하거나 WordPress 블로그에서 자동으로 가져올 수 있습니다.
                </p>
              </div>

              {/* 저장 버튼 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    "inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-medium",
                    saveSuccess 
                      ? "bg-green-600 text-white hover:bg-green-700" 
                      : "bg-blue-600 text-white hover:bg-blue-700",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600",
                    "transition-colors duration-200"
                  )}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      저장 완료
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      저장
                    </>
                  )}
                </button>

                {saveSuccess && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    성공적으로 저장되었습니다
                  </div>
                )}
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="ml-2">
                      <h5 className="text-sm font-medium text-red-800">오류</h5>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">호텔을 선택하세요</h3>
              <p className="text-gray-600">
                왼쪽에서 편집할 호텔을 검색하고 선택하면<br />
                여기서 property_details를 편집하거나 WordPress 블로그에서 자동으로 추출할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


