'use client'

import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Building2,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface FeatureSlot {
  id: number
  sabre_id: string
  surface: string
  slot_key: string
  created_at: string
  select_hotels: {
    property_name_ko: string
  }
}

interface FeatureSlotForm {
  sabre_id: string
  slot_key: string
}

interface Hotel {
  sabre_id: string
  property_name_ko: string
  property_name_en: string
}

export default function BannerManager() {
  const [currentSlot, setCurrentSlot] = useState<FeatureSlot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // 폼 상태
  const [formData, setFormData] = useState<FeatureSlotForm>({
    sabre_id: '',
    slot_key: ''
  })
  const [formLoading, setFormLoading] = useState(false)
  
  
  // 호텔 검색 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Hotel[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // 데이터 로드
  const loadBannerSlot = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/feature-slots/banner')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '데이터를 불러올 수 없습니다.')
      }

      if (data.success) {
        const bannerSlot = data.data
        setCurrentSlot(bannerSlot || null)
        
        // 폼 데이터 초기화
        if (bannerSlot) {
          setFormData({
            sabre_id: bannerSlot.sabre_id,
            slot_key: bannerSlot.slot_key
          })
        } else {
          setFormData({
            sabre_id: '',
            slot_key: ''
          })
        }
      } else {
        throw new Error(data.error || '데이터를 불러올 수 없습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 초기 로드
  useEffect(() => {
    loadBannerSlot()
  }, [])

  // 폼 초기화
  const resetForm = () => {
    if (currentSlot) {
      setFormData({
        sabre_id: currentSlot.sabre_id,
        slot_key: currentSlot.slot_key
      })
    } else {
      setFormData({
        sabre_id: '',
        slot_key: ''
      })
    }
    setFormLoading(false)
  }

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const url = '/api/feature-slots/banner'
      const method = currentSlot ? 'PUT' : 'POST'
      
      const payload = {
        ...formData
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '저장에 실패했습니다.')
      }

      if (data.success) {
        setSuccess(currentSlot ? '상단 베너가 수정되었습니다.' : '새 상단 베너가 생성되었습니다.')
        loadBannerSlot() // 데이터 다시 로드
      } else {
        throw new Error(data.error || '저장에 실패했습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setFormLoading(false)
    }
  }

  // 삭제
  const handleDelete = async () => {
    if (!currentSlot) return
    
    if (!confirm('정말로 상단 베너를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch('/api/feature-slots/banner', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '삭제에 실패했습니다.')
      }

      if (data.success) {
        setSuccess('상단 베너가 삭제되었습니다.')
        loadBannerSlot()
      } else {
        throw new Error(data.error || '삭제에 실패했습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.')
    }
  }

  // 호텔 검색
  const searchHotels = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const response = await fetch('/api/hotel/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query }),
      })

      const data = await response.json()

      if (data.success) {
        setSearchResults(data.data || [])
      } else {
        setSearchResults([])
      }
    } catch (err) {
      console.error('호텔 검색 오류:', err)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  // 호텔 선택
  const selectHotel = (hotel: Hotel) => {
    setFormData(prev => ({
      ...prev,
      sabre_id: hotel.sabre_id
    }))
    setSearchQuery('')
    setSearchResults([])
  }

  // 검색어 변경 핸들러 (디바운싱)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchHotels(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">상단 베너 관리</h2>
          <p className="text-sm text-gray-600 mt-1">
            {currentSlot ? '상단 베너 설정을 수정하세요' : '상단 베너에 표시될 호텔을 설정하세요'}
          </p>
        </div>
        {currentSlot && (
          <Button
            onClick={handleDelete}
            variant="outline"
            className="flex items-center gap-2 text-red-600 hover:text-red-800"
          >
            <Trash2 className="h-4 w-4" />
            삭제
          </Button>
        )}
      </div>

      {/* 성공/에러 메시지 */}
      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 폼 */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {currentSlot ? '상단 베너 수정' : '상단 베너 생성'}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={resetForm}
            disabled={formLoading}
          >
            초기화
          </Button>
        </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  호텔 검색
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="호텔명 또는 Sabre ID로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  
                  {/* 검색 결과 드롭다운 */}
                  {searchQuery && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {searchLoading ? (
                        <div className="p-3 text-center text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          검색 중...
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((hotel) => (
                          <button
                            key={hotel.sabre_id}
                            type="button"
                            onClick={() => selectHotel(hotel)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{hotel.property_name_ko}</div>
                            <div className="text-sm text-gray-500">{hotel.property_name_en}</div>
                            <div className="text-xs text-gray-400">Sabre ID: {hotel.sabre_id}</div>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-gray-500">
                          검색 결과가 없습니다.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sabre ID
                </label>
                <Input
                  type="text"
                  value={formData.sabre_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, sabre_id: e.target.value }))}
                  placeholder="호텔의 Sabre ID"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  슬롯 키
                </label>
                <Input
                  type="text"
                  value={formData.slot_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, slot_key: e.target.value }))}
                  placeholder="슬롯 식별자"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="submit"
                disabled={formLoading}
                className="flex items-center gap-2"
              >
                {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                {currentSlot ? '수정' : '생성'}
              </Button>
            </div>
          </form>
        </div>

      {/* 현재 상단 베너 정보 */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">현재 상단 베너 설정</h3>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">데이터를 불러오는 중...</p>
          </div>
        ) : currentSlot ? (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">호텔명</label>
                <p className="text-lg font-medium text-gray-900">
                  {currentSlot.select_hotels?.property_name_ko || '호텔 정보 없음'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Sabre ID</label>
                <p className="text-lg font-medium text-gray-900">{currentSlot.sabre_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">슬롯 키</label>
                <p className="text-lg font-medium text-gray-900">{currentSlot.slot_key}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-500 mb-2">생성일</label>
              <p className="text-sm text-gray-600">
                {new Date(currentSlot.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">설정된 상단 베너가 없습니다.</p>
            <p className="text-sm text-gray-400 mt-2">위 폼을 사용하여 상단 베너를 설정하세요.</p>
          </div>
        )}
      </div>
    </div>
  )
}
