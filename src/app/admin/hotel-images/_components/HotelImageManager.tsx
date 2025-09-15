'use client'

import React, { useState } from 'react'
import { Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react'
import NextImage from 'next/image'
import HotelSearchWidget from '@/components/shared/hotel-search-widget'

interface HotelImage {
  id: string
  url: string
  caption?: string
  category?: string
  width?: number
  height?: number
}

interface HotelImageResponse {
  success: boolean
  data?: HotelImage[]
  error?: string
}

export function HotelImageManager() {
  const [images, setImages] = useState<HotelImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<HotelImage | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const searchImages = async (sabreCode: string | null | undefined) => {
    if (!sabreCode || typeof sabreCode !== 'string' || !sabreCode.trim()) {
      setError('Sabre Hotel Code를 입력해주세요.')
      return
    }

    setLoading(true)
    setError(null)
    setImages([])

    try {
      const response = await fetch(`/api/hotel/images?sabreCode=${encodeURIComponent(sabreCode.trim())}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`API 오류 (${response.status}): ${response.statusText}`)
      }

      const data: HotelImageResponse = await response.json().catch(() => {
        throw new Error('서버 응답을 파싱할 수 없습니다.')
      })

      if (data.success && data.data) {
        setImages(data.data)
        if (data.error) {
          setError(data.error)
        }
      } else {
        setError(data.error || '이미지를 찾을 수 없습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleHotelSelect = (sabreId: string | null | undefined) => {
    searchImages(sabreId)
  }

  const openImageModal = (image: HotelImage, index: number) => {
    setSelectedImage(image)
    setCurrentImageIndex(index)
  }

  const closeImageModal = () => {
    setSelectedImage(null)
    setCurrentImageIndex(0)
  }

  const showPreviousImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
      setSelectedImage(images[currentImageIndex - 1])
    }
  }

  const showNextImage = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
      setSelectedImage(images[currentImageIndex + 1])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeImageModal()
    } else if (e.key === 'ArrowLeft') {
      showPreviousImage()
    } else if (e.key === 'ArrowRight') {
      showNextImage()
    }
  }

  return (
    <div className="min-h-[60vh]">
      {/* 페이지 헤더 */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <ImageIcon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">호텔 이미지 관리</h1>
          <p className="text-sm text-gray-600 mt-1">호텔을 검색하고 선택하여 해당 호텔의 이미지를 확인하세요</p>
        </div>
      </div>

      {/* 공통 호텔 검색 위젯 */}
      <HotelSearchWidget
        hideHeader={true}
        enableHotelEdit={false}
        showInitialHotels={false}
        onHotelSelect={handleHotelSelect}
      />

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            {error}
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="rounded-lg border bg-white p-4 text-gray-700">이미지를 불러오는 중...</div>
      )}

      {/* 이미지 리스트 */}
      {images.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            검색 결과 ({images.length}개)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="group cursor-pointer bg-gray-50 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200"
                onClick={() => openImageModal(image, index)}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <NextImage
                    unoptimized
                    src={image.url}
                    alt={image.caption || '호텔 이미지'}
                    width={image.width ?? 800}
                    height={image.height ?? 600}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
                <div className="p-3">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {image.caption || '이미지'}
                  </div>
                  {image.category && (
                    <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full inline-block">
                      {image.category}
                    </div>
                  )}
                  {image.width && image.height && (
                    <div className="text-xs text-gray-400 mt-1">
                      {image.width} × {image.height}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 이미지 상세 보기 모달 */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="relative max-w-4xl max-h-[90vh] mx-4">
            {/* 닫기 버튼 */}
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* 이전/다음 버튼 */}
            {images.length > 1 && (
              <>
                <button
                  onClick={showPreviousImage}
                  disabled={currentImageIndex === 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 hover:bg-black/70 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={showNextImage}
                  disabled={currentImageIndex === images.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 hover:bg-black/70 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* 이미지 */}
            <div className="relative">
              <NextImage
                unoptimized
                src={selectedImage.url}
                alt={selectedImage.caption || '호텔 이미지'}
                width={selectedImage.width ?? 1600}
                height={selectedImage.height ?? 1200}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />

              {/* 이미지 정보 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
                <div className="text-white">
                  <h3 className="text-xl font-semibold mb-2">
                    {selectedImage.caption || '호텔 이미지'}
                  </h3>
                  <div className="flex items-center gap-4 text-sm">
                    {selectedImage.category && (
                      <span className="bg-white/20 px-3 py-1 rounded-full">
                        {selectedImage.category}
                      </span>
                    )}
                    {selectedImage.width && selectedImage.height && (
                      <span>
                        {selectedImage.width} × {selectedImage.height}
                      </span>
                    )}
                    <span>
                      {currentImageIndex + 1} / {images.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
