'use client'

import React, { useState, useEffect } from 'react'
import { Loader2, CheckCircle, AlertCircle, Edit, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HotelSearchResult } from '@/types/hotel'
import { ContentEditorSection } from '@/components/shared/content-editor-section'

import 'react-quill-new/dist/quill.snow.css'

const ARTICLE_GENERATION_TICKER_STEPS = [
  '프롬프트 분석 중…',
  '호텔 정보 반영 중…',
  'AI가 본문 생성 중…',
  '문체 검토 중…',
] as const

const TICKER_INTERVAL_MS = 2_000

interface ContentEditorPanelProps {
  hotel: HotelSearchResult
  hotelId: string
  onClose: () => void
}

export function ContentEditorPanel({ hotel, hotelId, onClose }: ContentEditorPanelProps) {
  const [propertyDetails, setPropertyDetails] = useState('')
  const [propertyLocation, setPropertyLocation] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false)
  const [articleTickerIndex, setArticleTickerIndex] = useState(0)
  const [articleSuccess, setArticleSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sabreId = hotel?.sabre_id != null ? String(hotel.sabre_id) : ''

  useEffect(() => {
    if (!sabreId) {
      setIsLoading(false)
      setError('Sabre ID가 없습니다.')
      return
    }
    let cancelled = false
    setError(null)
    setPropertyDetails('')
    setPropertyLocation('')

    const load = async () => {
      try {
        const response = await fetch(`/api/hotel/content?sabre_id=${sabreId}`)
        if (!response.ok) {
          const errorData = await response.json()
          if (!cancelled) setError(errorData.error || '호텔 정보를 불러올 수 없습니다.')
          return
        }
        const data = await response.json()
        if (!data.success) {
          if (!cancelled) setError(data.error || '호텔 정보를 불러올 수 없습니다.')
          return
        }
        if (!cancelled) {
          setPropertyDetails(data.data.property_details || '')
          setPropertyLocation(data.data.property_location || '')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '호텔 정보를 불러올 수 없습니다.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [sabreId])

  useEffect(() => {
    if (!isGeneratingArticle) {
      setArticleTickerIndex(0)
      return
    }
    const id = setInterval(() => {
      setArticleTickerIndex((i) => (i + 1) % ARTICLE_GENERATION_TICKER_STEPS.length)
    }, TICKER_INTERVAL_MS)
    return () => clearInterval(id)
  }, [isGeneratingArticle])

  const handleGenerateArticle = async () => {
    if (!sabreId) {
      setError('호텔을 먼저 선택해주세요.')
      return
    }
    if (!hotel?.property_name_en?.trim()) {
      setError('선택한 호텔에 영문명이 없어 소개 아티클을 생성할 수 없습니다.')
      return
    }
    setIsGeneratingArticle(true)
    setError(null)
    setArticleSuccess(false)
    try {
      const response = await fetch('/api/hotel/content/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sabre_id: sabreId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '호텔 소개 아티클 생성에 실패했습니다.')
      if (!data.success) throw new Error(data.error || '호텔 소개 아티클 생성에 실패했습니다.')
      setPropertyDetails(data.data?.content ?? '')
      setPropertyLocation(data.data?.locationContent ?? '')
      setArticleSuccess(true)
      setTimeout(() => setArticleSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '호텔 소개 아티클 생성에 실패했습니다.')
    } finally {
      setIsGeneratingArticle(false)
    }
  }

  const handleSaveField = async (field: 'property_details' | 'property_location', value: string) => {
    if (!sabreId) return
    setError(null)
    try {
      const response = await fetch('/api/hotel/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sabre_id: sabreId, [field]: value }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '저장에 실패했습니다.')
      }
      const data = await response.json()
      if (!data.success) throw new Error(data.error || '저장에 실패했습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
      throw err
    }
  }

  return (
    <div className="animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-medium text-gray-900">호텔 기본 소개 편집</h4>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="패널 닫기"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 text-blue-600 animate-spin" />
          <p className="text-gray-600">호텔 정보를 불러오는 중...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">선택된 호텔</h3>
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700">Sabre ID:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {sabreId}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-sm font-medium text-gray-700">한글명:</span>
                <span className="text-sm text-gray-900">
                  {hotel?.property_name_ko ?? '한글명 없음'}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-sm font-medium text-gray-700">영문명:</span>
                <span className="text-sm text-gray-900">
                  {hotel?.property_name_en ?? '영문명 없음'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">호텔 기본 소개 AI 작성</h3>
            <p className="text-sm text-gray-600 mb-3">
              선택한 호텔의 <strong>영문명</strong>을 기준으로 호텔 소개 본문을 생성하여 Property Details 에디터에 넣습니다.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleGenerateArticle}
                disabled={isGeneratingArticle || !hotel?.property_name_en?.trim()}
                className={cn(
                  'inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium cursor-pointer',
                  'bg-blue-600 text-white hover:bg-blue-700',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600',
                  'transition-colors duration-200'
                )}
              >
                {isGeneratingArticle ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    호텔 기본 소개 AI 작성
                  </>
                )}
              </button>
              {isGeneratingArticle && (
                <div
                  role="status"
                  aria-live="polite"
                  aria-label="AI 생성 진행 단계"
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
                    'bg-blue-50 text-blue-700 border border-blue-200',
                    'animate-in fade-in duration-200'
                  )}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-600" />
                  </span>
                  <span className="tabular-nums">
                    {ARTICLE_GENERATION_TICKER_STEPS[articleTickerIndex]}
                  </span>
                </div>
              )}
            </div>
            {articleSuccess && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                호텔 소개 아티클을 생성하여 Property Details에 반영했습니다
              </div>
            )}
          </div>

          <div className="space-y-4">
            <ContentEditorSection
              title="Property Details"
              content={propertyDetails}
              onContentChange={setPropertyDetails}
              onSave={async () => handleSaveField('property_details', propertyDetails)}
              sabreId={sabreId}
              initialExpanded={true}
            />
            <ContentEditorSection
              title="Property Location"
              content={propertyLocation}
              onContentChange={setPropertyLocation}
              onSave={async () => handleSaveField('property_location', propertyLocation)}
              sabreId={sabreId}
              initialExpanded={true}
            />
          </div>
        </div>
      )}
    </div>
  )
}
