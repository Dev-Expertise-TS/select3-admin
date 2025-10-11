'use client'

import React, { useState } from 'react'
import { FileText, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import HotelSearchWidget from '@/components/shared/hotel-search-widget'
import { AuthGuard } from '@/components/shared/auth-guard'
import { ContentEditorSection } from '@/components/shared/content-editor-section'

import 'react-quill-new/dist/quill.snow.css'

interface HotelContent {
  sabre_id: string
  property_name_ko: string | null
  property_name_en: string | null
  property_details: string | null
  property_location: string | null
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
  const [propertyLocation, setPropertyLocation] = useState('')
  const [wordpressUrl, setWordpressUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractSuccess, setExtractSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 모달 닫기
  const handleCloseModal = () => {
    setSelectedHotel(null)
    setPropertyDetails('')
    setPropertyLocation('')
    setWordpressUrl('')
    setError(null)
    setExtractSuccess(false)
  }

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
    setPropertyLocation('')
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
      
      setSelectedHotel(data.data)
      setPropertyDetails(data.data.property_details || '')
      setPropertyLocation(data.data.property_location || '')
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

      // 추출된 본문을 Property Details에 설정
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

  // 필드 저장 공통 함수
  const handleSaveField = async (field: 'property_details' | 'property_location', value: string) => {
    if (!selectedHotel?.sabre_id) return

    setError(null)

    try {
      const response = await fetch('/api/hotel/content', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sabre_id: selectedHotel.sabre_id,
          [field]: value
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

    } catch (err) {
      console.error(`${field} 저장 오류:`, err)
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
      throw err
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
            호텔을 검색하고 선택하여 property_details 콘텐츠를 편집하거나 WordPress 블로그에서 자동으로 추출하세요
          </p>
        </div>
      </div>

      {/* 호텔 검색 - 전체 너비 */}
      <div className="space-y-6">
        <HotelSearchWidget
          hideHeader={true}
          onHotelSelect={handleHotelSelect}
          enableHotelEdit={false}
          showInitialHotels={true}
        />
      </div>

      {/* 편집 모달 */}
      {selectedHotel && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full border-2 border-gray-300 p-8 text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-4 text-blue-600 animate-spin" />
              <p className="text-gray-600">호텔 정보를 불러오는 중...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden border-2 border-gray-300">
              {/* 헤더 */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">호텔 콘텐츠 편집</h2>
                  <p className="text-sm text-gray-600 mt-1">선택된 호텔의 상세 정보를 편집합니다</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* 폼 */}
              <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
                {/* 에러 메시지 */}
                {error && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <p className="text-red-800">{error}</p>
                    </div>
                  </div>
                )}

                {/* 기본 정보 */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">선택된 호텔</h3>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-700">Sabre ID:</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {selectedHotel.sabre_id}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm font-medium text-gray-700">한글명:</span>
                      <span className="text-sm text-gray-900">
                        {selectedHotel.property_name_ko || '한글명 없음'}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm font-medium text-gray-700">영문명:</span>
                      <span className="text-sm text-gray-900">
                        {selectedHotel.property_name_en || '영문명 없음'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* WordPress 추출 섹션 */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">WordPress 블로그 추출</h3>
                  <div className="flex gap-2 mb-2">
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
                        "inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium cursor-pointer",
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
                  <p className="text-xs text-gray-500">
                    WordPress 블로그 URL을 입력하고 &quot;본문 추출&quot; 버튼을 클릭하면 자동으로 본문을 가져옵니다
                  </p>
                  {extractSuccess && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      WordPress 블로그 본문을 성공적으로 추출했습니다
                    </div>
                  )}
                </div>

                {/* 콘텐츠 섹션 */}
                <div className="space-y-4">
                  <ContentEditorSection
                    title="Property Details"
                    content={propertyDetails}
                    onContentChange={setPropertyDetails}
                    onSave={async () => handleSaveField('property_details', propertyDetails)}
                    sabreId={selectedHotel.sabre_id}
                    initialExpanded={true}
                  />
                  
                  <ContentEditorSection
                    title="Property Location"
                    content={propertyLocation}
                    onContentChange={setPropertyLocation}
                    onSave={async () => handleSaveField('property_location', propertyLocation)}
                    sabreId={selectedHotel.sabre_id}
                    initialExpanded={false}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
