'use client'

import React, { useState, useEffect } from 'react'
import { 
  Save, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Search,
  Image
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FeatureSlotTable } from '@/components/shared/data-table'

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
  const [slots, setSlots] = useState<FeatureSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // 폼 상태
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
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
  const loadSlots = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/feature-slots/banner')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '데이터를 불러올 수 없습니다.')
      }

      if (data.success) {
        // 단일 레코드를 배열로 변환 (테이블 형태로 표시하기 위해)
        const bannerSlot = data.data
        setSlots(bannerSlot ? [bannerSlot] : [])
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
    loadSlots()
  }, [])

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      sabre_id: '',
      slot_key: ''
    })
    setShowForm(false)
    setEditingId(null)
    setFormLoading(false)
    setSearchQuery('')
    setSearchResults([])
  }

  // 새 항목 추가
  const handleAddNew = () => {
    resetForm()
    setShowForm(true)
  }

  // 편집 시작
  const handleEdit = (row: unknown) => {
    const slot = row as FeatureSlot
    setFormData({
      sabre_id: slot.sabre_id,
      slot_key: slot.slot_key
    })
    setEditingId(slot.id)
    setShowForm(true)
  }

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const url = '/api/feature-slots/banner'
      const method = editingId ? 'PUT' : 'POST'
      
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
        setSuccess(editingId ? '상단 베너가 수정되었습니다.' : '새 상단 베너가 생성되었습니다.')
        resetForm()
        loadSlots() // 데이터 다시 로드
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
        loadSlots()
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
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              상단 베너 관리
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              select_feature_slots 테이블의 surface=&apos;상단베너&apos; 레코드를 관리합니다
            </p>
          </div>
        </div>
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
      {showForm && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingId ? '슬롯 수정' : '새 슬롯 추가'}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={resetForm}
              disabled={formLoading}
            >
              <X className="h-4 w-4" />
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
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={formLoading}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
                className="flex items-center gap-2"
              >
                {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                {editingId ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 데이터 테이블 */}
      <FeatureSlotTable
        title="상단 베너 슬롯 목록"
        subtitle={`총 ${slots.length}개의 항목`}
        data={slots as unknown as Record<string, unknown>[]}
        loading={loading}
        onAdd={handleAddNew}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}
