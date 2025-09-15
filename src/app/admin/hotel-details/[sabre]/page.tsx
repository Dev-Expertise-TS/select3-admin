'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Image as ImageIcon, X, ChevronLeft, ChevronRight, Building2, MapPin } from 'lucide-react'
import NextImage from 'next/image'

interface HotelImage {
  id: string
  url: string
  caption?: string
  category?: string
  width?: number
  height?: number
}

interface HotelDetails {
  sabre_id: string
  property_name_ko: string
  property_name_en: string
  property_address: string
  city: string
  country: string
  chain_ko: string
  chain_en: string
  brand_ko: string
  brand_en: string
  property_details: string
  image_1?: string
  image_2?: string
  image_3?: string
  image_4?: string
  image_5?: string
}

export default function HotelDetailsPage() {
  const params = useParams()
  const sabreId = params.sabre as string

  const [hotelDetails, setHotelDetails] = useState<HotelDetails | null>(null)
  const [images, setImages] = useState<HotelImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<HotelImage | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // 호텔 상세 정보 로드
  useEffect(() => {
    const loadHotelDetails = async () => {
      if (!sabreId) return

      setLoading(true)
      setError(null)

      try {
        // 호텔 상세 정보 로드
        const hotelResponse = await fetch(`/api/hotel/get?sabre_id=${sabreId}`)
        if (!hotelResponse.ok) {
          throw new Error('호텔 정보를 불러올 수 없습니다.')
        }
        const hotelData = await hotelResponse.json()
        
        if (!hotelData.success) {
          throw new Error(hotelData.error || '호텔 정보를 불러올 수 없습니다.')
        }

        setHotelDetails(hotelData.data)

        // 호텔 이미지 로드
        const imagesResponse = await fetch(`/api/hotel/images?sabreCode=${sabreId}`)
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json()
          if (imagesData.success && imagesData.data) {
            setImages(imagesData.data)
          }
        }
      } catch (err) {
        console.error('호텔 정보 로딩 오류:', err)
        setError(err instanceof Error ? err.message : '호텔 정보를 불러올 수 없습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadHotelDetails()
  }, [sabreId])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">호텔 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !hotelDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">호텔을 찾을 수 없습니다</h1>
          <p className="text-gray-600 mb-4">{error || '요청하신 호텔 정보를 찾을 수 없습니다.'}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {hotelDetails.property_name_ko || hotelDetails.property_name_en}
              </h1>
              <p className="text-lg text-gray-600 mt-1">
                {hotelDetails.property_name_en && hotelDetails.property_name_ko !== hotelDetails.property_name_en && hotelDetails.property_name_en}
              </p>
              <div className="flex items-center mt-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{hotelDetails.property_address}</span>
              </div>
            </div>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              돌아가기
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 호텔 기본 정보 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            호텔 정보
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">기본 정보</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Sabre ID:</span>
                  <span className="ml-2 text-gray-900">{hotelDetails.sabre_id}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">도시:</span>
                  <span className="ml-2 text-gray-900">{hotelDetails.city}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">국가:</span>
                  <span className="ml-2 text-gray-900">{hotelDetails.country}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">체인 & 브랜드</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">체인:</span>
                  <span className="ml-2 text-gray-900">{hotelDetails.chain_ko || hotelDetails.chain_en}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">브랜드:</span>
                  <span className="ml-2 text-gray-900">{hotelDetails.brand_ko || hotelDetails.brand_en}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 이미지 갤러리 */}
        {images.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <ImageIcon className="h-5 w-5 mr-2" />
              호텔 이미지 ({images.length}개)
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 첫 번째 이미지 (image_1) - 큰 영역 */}
              {images[0] && (
                <div
                  key={images[0].id}
                  className="lg:col-span-2 group cursor-pointer bg-gray-50 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200"
                  onClick={() => openImageModal(images[0], 0)}
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    <NextImage
                      unoptimized
                      src={images[0].url}
                      alt={images[0].caption || '호텔 메인 이미지'}
                      width={images[0].width ?? 1200}
                      height={images[0].height ?? 750}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="p-4">
                    <div className="text-lg font-medium text-gray-900 mb-2">
                      {images[0].caption || '메인 이미지'}
                    </div>
                    {images[0].category && (
                      <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full inline-block">
                        {images[0].category}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 나머지 이미지들 - 작은 그리드 */}
              <div className="grid grid-cols-1 gap-4">
                {images.slice(1).map((image, index) => (
                  <div
                    key={image.id}
                    className="group cursor-pointer bg-gray-50 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200"
                    onClick={() => openImageModal(image, index + 1)}
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      <NextImage
                        unoptimized
                        src={image.url}
                        alt={image.caption || '호텔 이미지'}
                        width={image.width ?? 400}
                        height={image.height ?? 300}
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 호텔 상세 설명 */}
        {hotelDetails.property_details && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">호텔 상세 정보</h2>
            <div 
              className="prose max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: hotelDetails.property_details }}
            />
          </div>
        )}

        {/* 이미지 상세 보기 모달 */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={closeImageModal}
          >
            <div className="relative max-w-4xl max-h-[90vh] mx-4">
              <button
                onClick={closeImageModal}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              >
                <X className="h-8 w-8" />
              </button>
              
              {images.length > 1 && (
                <>
                  <button
                    onClick={showPreviousImage}
                    disabled={currentImageIndex === 0}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </button>
                  <button
                    onClick={showNextImage}
                    disabled={currentImageIndex === images.length - 1}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                  >
                    <ChevronRight className="h-8 w-8" />
                  </button>
                </>
              )}

              <div className="relative">
                <NextImage
                  unoptimized
                  src={selectedImage.url}
                  alt={selectedImage.caption || '호텔 이미지'}
                  width={selectedImage.width ?? 1200}
                  height={selectedImage.height ?? 800}
                  className="max-w-full max-h-[90vh] object-contain rounded-lg"
                />
              </div>

              <div className="absolute bottom-4 left-4 right-4 text-center">
                <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
                  <div className="font-medium">{selectedImage.caption || '이미지'}</div>
                  {images.length > 1 && (
                    <div className="text-sm opacity-75">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
