'use client'

import React, { useState } from 'react'
import { Image as ImageIcon, Save, Edit3, Eye, EyeOff } from 'lucide-react'
import NextImage from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import HotelSearchWidget from '@/components/shared/hotel-search-widget'

interface HotelImageData {
  sabre_id: string | null
  property_name_ko: string | null
  property_name_en: string | null
  image_1: string | null
  image_2: string | null
  image_3: string | null
  image_4: string | null
  image_5: string | null
}

interface HotelImageResponse {
  success: boolean
  data?: HotelImageData
  error?: string
}

export function HotelImageManager() {
  const [selectedHotel, setSelectedHotel] = useState<HotelImageData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingImages, setEditingImages] = useState<boolean>(false)
  const [imageUrls, setImageUrls] = useState<{
    image_1: string
    image_2: string
    image_3: string
    image_4: string
    image_5: string
  }>({
    image_1: '',
    image_2: '',
    image_3: '',
    image_4: '',
    image_5: ''
  })

  const fetchHotelImages = async (sabreCode: string | null | undefined) => {
    console.log('🔄 fetchHotelImages 시작:', {
      sabreCode: sabreCode,
      sabreCodeType: typeof sabreCode,
      sabreCodeValue: sabreCode,
      isFalsy: !sabreCode,
      isNotString: typeof sabreCode !== 'string',
      isEmpty: sabreCode && typeof sabreCode === 'string' && !sabreCode.trim()
    });
    
    if (!sabreCode || typeof sabreCode !== 'string' || !sabreCode.trim()) {
      console.log('❌ fetchHotelImages 에러 조건 만족:', {
        sabreCode: sabreCode,
        reason: !sabreCode ? 'falsy' : typeof sabreCode !== 'string' ? 'not string' : 'empty string'
      });
      setError('Sabre ID가 없는 호텔입니다. 이미지 관리를 위해서는 Sabre ID가 필요합니다.')
      return
    }
    
    console.log('✅ fetchHotelImages 정상 진행:', sabreCode);

    setLoading(true)
    setError(null)
    setSuccess(null)
    setSelectedHotel(null)

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
        setSelectedHotel(data.data)
        setImageUrls({
          image_1: data.data.image_1 || '',
          image_2: data.data.image_2 || '',
          image_3: data.data.image_3 || '',
          image_4: data.data.image_4 || '',
          image_5: data.data.image_5 || ''
        })
        setEditingImages(false)
      } else {
        setError(data.error || '호텔 이미지 정보를 찾을 수 없습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleHotelSelect = (sabreId: string | null | undefined) => {
    console.log('🏨 HotelImageManager - 호텔 선택됨:', {
      sabreId: sabreId,
      sabreIdType: typeof sabreId,
      sabreIdValue: sabreId,
      isNull: sabreId === null,
      isUndefined: sabreId === undefined,
      isString: typeof sabreId === 'string',
      isNumber: typeof sabreId === 'number'
    });
    
    if (sabreId !== null && sabreId !== undefined) {
      console.log('✅ fetchHotelImages 호출:', sabreId);
      fetchHotelImages(sabreId)
    } else {
      console.log('❌ sabreId가 null/undefined여서 fetchHotelImages 호출하지 않음');
    }
  }

  const handleImageUrlChange = (field: keyof typeof imageUrls, value: string) => {
    setImageUrls(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveImageUrls = async () => {
    if (!selectedHotel) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/hotel/update-images', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sabre_id: selectedHotel.sabre_id,
          image_1: imageUrls.image_1 || null,
          image_2: imageUrls.image_2 || null,
          image_3: imageUrls.image_3 || null,
          image_4: imageUrls.image_4 || null,
          image_5: imageUrls.image_5 || null,
        })
      })

      if (!response.ok) {
        throw new Error(`API 오류 (${response.status}): ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setSuccess('이미지 URL이 성공적으로 저장되었습니다.')
        setEditingImages(false)
        // 업데이트된 데이터로 다시 설정
        if (data.data) {
          setSelectedHotel(data.data)
        }
      } else {
        setError(data.error || '이미지 URL 저장에 실패했습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const toggleEditMode = () => {
    setEditingImages(!editingImages)
    if (editingImages) {
      // 편집 모드에서 나갈 때 원래 값으로 복원
      if (selectedHotel) {
        setImageUrls({
          image_1: selectedHotel.image_1 || '',
          image_2: selectedHotel.image_2 || '',
          image_3: selectedHotel.image_3 || '',
          image_4: selectedHotel.image_4 || '',
          image_5: selectedHotel.image_5 || ''
        })
      }
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
          <p className="text-sm text-gray-600 mt-1">호텔을 검색하고 선택하여 이미지 URL을 관리하세요</p>
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            {error}
          </div>
        </div>
      )}

      {/* 성공 메시지 */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            {success}
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="rounded-lg border bg-white p-4 text-gray-700 mb-6">호텔 정보를 불러오는 중...</div>
      )}

      {/* 호텔 이미지 편집 영역 */}
      {selectedHotel && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedHotel.property_name_ko || selectedHotel.property_name_en || '호텔 정보'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">Sabre ID: {selectedHotel.sabre_id}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={toggleEditMode}
                variant={editingImages ? "outline" : "default"}
                className="flex items-center gap-2"
              >
                {editingImages ? <EyeOff className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                {editingImages ? '편집 취소' : '편집하기'}
              </Button>
              {editingImages && (
                <Button
                  onClick={saveImageUrls}
                  disabled={saving}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4" />
                  {saving ? '저장 중...' : '저장하기'}
                </Button>
              )}
            </div>
          </div>

          {/* 이미지 URL 편집 폼 */}
          <div className="space-y-6">
            {(['image_1', 'image_2', 'image_3', 'image_4', 'image_5'] as const).map((field, index) => (
              <div key={field} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이미지 {index + 1} URL
                  </label>
                  <Input
                    value={imageUrls[field]}
                    onChange={(e) => handleImageUrlChange(field, e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    disabled={!editingImages}
                    className={editingImages ? '' : 'bg-gray-50'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    미리보기
                  </label>
                  <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden border">
                    {imageUrls[field] ? (
                      <NextImage
                        unoptimized
                        src={imageUrls[field]}
                        alt={`이미지 ${index + 1}`}
                        width={400}
                        height={300}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            parent.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">이미지를 불러올 수 없습니다</div>'
                          }
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        이미지 URL을 입력하세요
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
