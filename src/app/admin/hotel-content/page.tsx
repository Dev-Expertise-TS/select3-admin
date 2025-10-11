'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { FileText, Save, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import HotelSearchWidget from '@/components/shared/hotel-search-widget'
import { AuthGuard } from '@/components/shared/auth-guard'

// Quill Editor 동적 import (client-side only) - React 19 호환 버전
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-50 rounded border flex items-center justify-center text-gray-500">에디터 로딩 중...</div>
})

import 'react-quill-new/dist/quill.snow.css'

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'indent',
  'align',
  'link', 'image',
  'blockquote', 'code-block'
]

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
  
  // Property Details 상태
  const [propertyDetails, setPropertyDetails] = useState('')
  const [editorContent1, setEditorContent1] = useState('')
  const [isExpanded1, setIsExpanded1] = useState(true)
  const [editorHeight1, setEditorHeight1] = useState<'small' | 'medium' | 'large'>('medium')
  const [isSaving1, setIsSaving1] = useState(false)
  const [saveSuccess1, setSaveSuccess1] = useState(false)
  
  // Property Location 상태
  const [propertyLocation, setPropertyLocation] = useState('')
  const [editorContent2, setEditorContent2] = useState('')
  const [isExpanded2, setIsExpanded2] = useState(false)
  const [editorHeight2, setEditorHeight2] = useState<'small' | 'medium' | 'large'>('medium')
  const [isSaving2, setIsSaving2] = useState(false)
  const [saveSuccess2, setSaveSuccess2] = useState(false)
  
  // 공통 상태
  const [wordpressUrl, setWordpressUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractSuccess, setExtractSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const debounceRef1 = useRef<NodeJS.Timeout | null>(null)
  const debounceRef2 = useRef<NodeJS.Timeout | null>(null)
  const quillRef1 = useRef<any>(null)
  const quillRef2 = useRef<any>(null)

  // 에디터 높이 설정
  const heightMap = {
    small: '390px',
    medium: '585px',
    large: '780px'
  }

  // 이미지 업로드 핸들러 (에디터 1용)
  const handleImageUpload1 = () => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      const formData = new FormData()
      formData.append('file', file)
      if (selectedHotel?.sabre_id) {
        formData.append('sabreId', selectedHotel.sabre_id)
      }

      try {
        const response = await fetch('/api/hotel/content/upload-image', {
          method: 'POST',
          body: formData
        })

        const result = await response.json()

        if (result.success) {
          const quill = quillRef1.current?.getEditor?.()
          if (quill) {
            const range = quill.getSelection(true) || { index: quill.getLength() }
            quill.insertEmbed(range.index, 'image', result.data.url)
            quill.setSelection(range.index + 1)
          }
        } else {
          alert(result.error || '이미지 업로드에 실패했습니다.')
        }
      } catch (err) {
        console.error('이미지 업로드 오류:', err)
        alert('이미지 업로드 중 오류가 발생했습니다.')
      }
    }

    input.click()
  }

  // 이미지 업로드 핸들러 (에디터 2용)
  const handleImageUpload2 = () => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      const formData = new FormData()
      formData.append('file', file)
      if (selectedHotel?.sabre_id) {
        formData.append('sabreId', selectedHotel.sabre_id)
      }

      try {
        const response = await fetch('/api/hotel/content/upload-image', {
          method: 'POST',
          body: formData
        })

        const result = await response.json()

        if (result.success) {
          const quill = quillRef2.current?.getEditor?.()
          if (quill) {
            const range = quill.getSelection(true) || { index: quill.getLength() }
            quill.insertEmbed(range.index, 'image', result.data.url)
            quill.setSelection(range.index + 1)
          }
        } else {
          alert(result.error || '이미지 업로드에 실패했습니다.')
        }
      } catch (err) {
        console.error('이미지 업로드 오류:', err)
        alert('이미지 업로드 중 오류가 발생했습니다.')
      }
    }

    input.click()
  }

  // Quill 에디터 모듈 설정 (에디터 1)
  const quillModules1 = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['blockquote', 'code-block'],
        ['clean']
      ],
      handlers: {
        image: handleImageUpload1
      }
    }
  }), [selectedHotel?.sabre_id])

  // Quill 에디터 모듈 설정 (에디터 2)
  const quillModules2 = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['blockquote', 'code-block'],
        ['clean']
      ],
      handlers: {
        image: handleImageUpload2
      }
    }
  }), [selectedHotel?.sabre_id])

  // WordPress 추출 시에만 에디터 업데이트 (호텔 선택 시는 직접 설정)
  useEffect(() => {
    // WordPress 추출 성공 시에만 실행
    if (extractSuccess && propertyDetails) {
      setEditorContent1(propertyDetails)
    }
  }, [extractSuccess, propertyDetails])

  // cleanup: 언마운트 시 debounce 타이머 정리
  useEffect(() => {
    return () => {
      if (debounceRef1.current) {
        clearTimeout(debounceRef1.current)
      }
      if (debounceRef2.current) {
        clearTimeout(debounceRef2.current)
      }
    }
  }, [])

  // Property Details 에디터 변경 핸들러
  const handleEditor1Change = (htmlContent: string) => {
    setEditorContent1(htmlContent)
    setSaveSuccess1(false)
    
    if (debounceRef1.current) {
      clearTimeout(debounceRef1.current)
    }
    debounceRef1.current = setTimeout(() => {
      setPropertyDetails(htmlContent)
    }, 500)
  }

  // Property Location 에디터 변경 핸들러
  const handleEditor2Change = (htmlContent: string) => {
    setEditorContent2(htmlContent)
    setSaveSuccess2(false)
    
    if (debounceRef2.current) {
      clearTimeout(debounceRef2.current)
    }
    debounceRef2.current = setTimeout(() => {
      setPropertyLocation(htmlContent)
    }, 500)
  }

  // 모달 닫기
  const handleCloseModal = () => {
    setSelectedHotel(null)
    setPropertyDetails('')
    setPropertyLocation('')
    setEditorContent1('')
    setEditorContent2('')
    setWordpressUrl('')
    setError(null)
    setSaveSuccess1(false)
    setSaveSuccess2(false)
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
    setEditorContent1('')
    setEditorContent2('')
    setWordpressUrl('')
    setExtractSuccess(false)
    setSaveSuccess1(false)
    setSaveSuccess2(false)
    setIsExpanded1(true)

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
      console.log('property_location:', data.data.property_location)
      
      setSelectedHotel(data.data)
      
      // Property Details 설정
      const details = data.data.property_details || ''
      setPropertyDetails(details)
      setEditorContent1(details)
      
      // Property Location 설정
      const location = data.data.property_location || ''
      setPropertyLocation(location)
      setEditorContent2(location)
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
      setEditorContent1(data.data.content || '')
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

  // Property Details 저장
  const handleSave1 = async () => {
    if (!selectedHotel?.sabre_id) return

    setIsSaving1(true)
    setError(null)

    try {
      setPropertyDetails(editorContent1)
      
      const response = await fetch('/api/hotel/content', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sabre_id: selectedHotel.sabre_id,
          property_details: editorContent1
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

      setSaveSuccess1(true)
      setTimeout(() => {
        setSaveSuccess1(false)
      }, 3000)

    } catch (err) {
      console.error('Property Details 저장 오류:', err)
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setIsSaving1(false)
    }
  }

  // Property Location 저장
  const handleSave2 = async () => {
    if (!selectedHotel?.sabre_id) return

    setIsSaving2(true)
    setError(null)

    try {
      setPropertyLocation(editorContent2)
      
      const response = await fetch('/api/hotel/content', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sabre_id: selectedHotel.sabre_id,
          property_location: editorContent2
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

      setSaveSuccess2(true)
      setTimeout(() => {
        setSaveSuccess2(false)
      }, 3000)

    } catch (err) {
      console.error('Property Location 저장 오류:', err)
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setIsSaving2(false)
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

                {/* Property Details 섹션 */}
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-medium text-gray-700">Property Details</h4>
                        <button
                          type="button"
                          onClick={() => setIsExpanded1(!isExpanded1)}
                          className={cn(
                            "inline-flex items-center px-3 py-1 rounded-md text-xs font-medium cursor-pointer border",
                            "bg-white hover:bg-gray-50 border-gray-300"
                          )}
                        >
                          {isExpanded1 ? '접기' : '편집하기'}
                        </button>
                        {propertyDetails && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            작성됨
                          </span>
                        )}
                        {saveSuccess1 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded animate-pulse">
                            ✓ 저장됨
                          </span>
                        )}
                      </div>
                      {isExpanded1 && (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 border rounded px-2 py-1 bg-white">
                            <button
                              type="button"
                              onClick={() => setEditorHeight1('small')}
                              className={cn(
                                "px-2 py-0.5 text-xs rounded",
                                editorHeight1 === 'small' ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                              )}
                              title="작게"
                            >
                              S
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditorHeight1('medium')}
                              className={cn(
                                "px-2 py-0.5 text-xs rounded",
                                editorHeight1 === 'medium' ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                              )}
                              title="보통"
                            >
                              M
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditorHeight1('large')}
                              className={cn(
                                "px-2 py-0.5 text-xs rounded",
                                editorHeight1 === 'large' ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                              )}
                              title="크게"
                            >
                              L
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={handleSave1}
                            disabled={isSaving1}
                            className={cn(
                              "inline-flex items-center px-4 py-1.5 rounded-md text-sm font-medium cursor-pointer",
                              "bg-green-600 text-white hover:bg-green-700",
                              "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                          >
                            {isSaving1 ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                저장중
                              </>
                            ) : (
                              '저장'
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {isExpanded1 && (
                      <div className="p-4 bg-white flex justify-center">
                        <div className="w-full max-w-4xl">
                          <ReactQuill
                            {...({ ref: quillRef1 } as any)}
                            key={`editor1-${selectedHotel?.sabre_id || 'new'}`}
                            theme="snow"
                            value={editorContent1 || ''}
                            onChange={handleEditor1Change}
                            modules={quillModules1}
                            formats={quillFormats}
                            className="bg-white"
                            style={{ height: heightMap[editorHeight1], marginBottom: '42px' }}
                            placeholder="Property details 콘텐츠를 입력하거나 WordPress 블로그에서 추출하세요..."
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Property Location 섹션 */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-medium text-gray-700">Property Location</h4>
                        <button
                          type="button"
                          onClick={() => setIsExpanded2(!isExpanded2)}
                          className={cn(
                            "inline-flex items-center px-3 py-1 rounded-md text-xs font-medium cursor-pointer border",
                            "bg-white hover:bg-gray-50 border-gray-300"
                          )}
                        >
                          {isExpanded2 ? '접기' : '편집하기'}
                        </button>
                        {propertyLocation && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            작성됨
                          </span>
                        )}
                        {saveSuccess2 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded animate-pulse">
                            ✓ 저장됨
                          </span>
                        )}
                      </div>
                      {isExpanded2 && (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 border rounded px-2 py-1 bg-white">
                            <button
                              type="button"
                              onClick={() => setEditorHeight2('small')}
                              className={cn(
                                "px-2 py-0.5 text-xs rounded",
                                editorHeight2 === 'small' ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                              )}
                              title="작게"
                            >
                              S
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditorHeight2('medium')}
                              className={cn(
                                "px-2 py-0.5 text-xs rounded",
                                editorHeight2 === 'medium' ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                              )}
                              title="보통"
                            >
                              M
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditorHeight2('large')}
                              className={cn(
                                "px-2 py-0.5 text-xs rounded",
                                editorHeight2 === 'large' ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                              )}
                              title="크게"
                            >
                              L
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={handleSave2}
                            disabled={isSaving2}
                            className={cn(
                              "inline-flex items-center px-4 py-1.5 rounded-md text-sm font-medium cursor-pointer",
                              "bg-green-600 text-white hover:bg-green-700",
                              "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                          >
                            {isSaving2 ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                저장중
                              </>
                            ) : (
                              '저장'
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {isExpanded2 && (
                      <div className="p-4 bg-white flex justify-center">
                        <div className="w-full max-w-4xl">
                          <ReactQuill
                            {...({ ref: quillRef2 } as any)}
                            key={`editor2-${selectedHotel?.sabre_id || 'new'}`}
                            theme="snow"
                            value={editorContent2 || ''}
                            onChange={handleEditor2Change}
                            modules={quillModules2}
                            formats={quillFormats}
                            className="bg-white"
                            style={{ height: heightMap[editorHeight2], marginBottom: '42px' }}
                            placeholder="Property location 콘텐츠를 입력하세요..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


