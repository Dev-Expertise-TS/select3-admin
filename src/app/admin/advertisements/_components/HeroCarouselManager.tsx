'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { 
  Plus, 
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
import HotelQuickSearch from '@/components/shared/hotel-quick-search'
import { saveFeatureSlot, deleteFeatureSlot } from '@/features/advertisements/actions'

interface FeatureSlot {
  id: number
  sabre_id: string
  surface: string
  slot_key: string
  start_date?: string | null
  end_date?: string | null
  created_at: string
  select_hotels: {
    property_name_ko: string
  }
}

interface FeatureSlotForm {
  sabre_id: string
  slot_key: string
  start_date?: string | null
  end_date?: string | null
}

interface Hotel {
  sabre_id: string
  property_name_ko: string
  property_name_en: string
}

export default function HeroCarouselManager() {
  const [slots, setSlots] = useState<FeatureSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // 폼 상태
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<FeatureSlotForm>({
    sabre_id: '',
    slot_key: '',
    start_date: null,
    end_date: null
  })
  
  // 호텔 검색 팝업 상태
  const [showHotelSearch, setShowHotelSearch] = useState(false)
  const [searchingSlotId, setSearchingSlotId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Hotel[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  
  // Server Actions을 위한 transition
  const [isPending, startTransition] = useTransition()

  // 데이터 로드
  const loadSlots = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/feature-slots')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '데이터를 불러올 수 없습니다.')
      }

      if (data.success) {
        setSlots(data.data || [])
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
      slot_key: '',
      start_date: null,
      end_date: null
    })
    setShowForm(false)
    setEditingId(null)
  }

  // 새 항목 추가 시작
  const handleAddNew = () => {
    resetForm()
    setShowForm(true)
  }

  // 편집 시작 (현재 사용하지 않음)
  // const handleEdit = (slot: FeatureSlot) => {
  //   setFormData({
  //     sabre_id: slot.sabre_id,
  //     slot_key: slot.slot_key
  //   })
  //   setEditingId(slot.id)
  //   setShowForm(true)
  // }

  // Upsert (현재 값으로 즉시 저장)
  const handleUpsert = async (slot: FeatureSlot) => {
    setError(null)

    try {
      const response = await fetch(`/api/feature-slots/${slot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sabre_id: slot.sabre_id,
          slot_key: slot.slot_key
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '저장 중 오류가 발생했습니다.')
      }

      if (data.success) {
        setSuccess('데이터가 성공적으로 저장되었습니다.')
        loadSlots()
        
        // 성공 메시지 3초 후 자동 숨김
        setTimeout(() => setSuccess(null), 3000)
      } else {
        throw new Error(data.error || '저장 중 오류가 발생했습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    }
  }


  // 호텔 검색 팝업 열기
  const handleHotelSearchOpen = (slotId: number) => {
    setSearchingSlotId(slotId)
    setSearchQuery('')
    setSearchResults([])
    setShowHotelSearch(true)
  }

  // 호텔 검색 팝업 닫기
  const handleHotelSearchClose = () => {
    setShowHotelSearch(false)
    setSearchingSlotId(null)
    setSearchQuery('')
    setSearchResults([])
  }

  // 호텔 검색 실행
  const handleHotelSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const response = await fetch(`/api/hotel/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (data.success) {
        setSearchResults(data.data || [])
      } else {
        setError(data.error || '호텔 검색 중 오류가 발생했습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '호텔 검색 중 오류가 발생했습니다.')
    } finally {
      setSearchLoading(false)
    }
  }

  // 호텔 선택
  const handleHotelSelect = async (hotel: Hotel) => {
    if (!searchingSlotId) return

    // 슬롯 데이터 업데이트
    setSlots(prev => prev.map(slot => 
      slot.id === searchingSlotId 
        ? {
            ...slot,
            sabre_id: hotel.sabre_id,
            select_hotels: {
              property_name_ko: hotel.property_name_ko
            }
          }
        : slot
    ))

    // 팝업 닫기
    handleHotelSearchClose()
  }

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const sabreIdStr = String(formData.sabre_id ?? '').trim()
    const slotKeyStr = String(formData.slot_key ?? '').trim()
    if (!sabreIdStr || !slotKeyStr) {
      setError('모든 필드를 입력해주세요.')
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        // FormData 생성
        const form = new FormData()
        if (editingId) {
          form.append('id', String(editingId))
        }
        form.append('sabre_id', sabreIdStr)
        form.append('slot_key', slotKeyStr)
        form.append('start_date', formData.start_date || '')
        form.append('end_date', formData.end_date || '')

        const result = await saveFeatureSlot(form)

        if (!result.success) {
          throw new Error(result.error || '저장 중 오류가 발생했습니다.')
        }

        setSuccess('저장되었습니다.')
        resetForm()
        loadSlots()
        
        // 성공 메시지 3초 후 자동 숨김
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
      }
    })
  }

  // 삭제
  const handleDelete = async (id: number) => {
    if (!confirm('정말로 이 항목을 삭제하시겠습니까?')) {
      return
    }

    startTransition(async () => {
      try {
        const result = await deleteFeatureSlot(id)

        if (!result.success) {
          throw new Error(result.error || '삭제 중 오류가 발생했습니다.')
        }

        setSuccess('삭제되었습니다.')
        loadSlots()
        
        // 성공 메시지 3초 후 자동 숨김
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-600 p-2">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              히어로 캐러셀 관리
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              select_feature_slots 테이블의 sabre_id, surface, slot_key 값을 관리합니다
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleAddNew}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          새 항목 추가
        </Button>
      </div>

      {/* 알림 메시지 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium">오류</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium">성공</h3>
            <p className="text-sm mt-1">{success}</p>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 폼 */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? '항목 수정' : '새 항목 추가'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  호텔명 또는 Sabre ID*
                </label>
                <HotelQuickSearch
                  onSelect={(hotel) => setFormData({ ...formData, sabre_id: hotel.sabre_id })}
                />
              </div>
              
              <div>
                <label htmlFor="slot_key" className="block text-sm font-medium text-gray-700 mb-2">
                  Slot Key *
                </label>
                <Input
                  id="slot_key"
                  type="text"
                  value={formData.slot_key}
                  onChange={(e) => setFormData({ ...formData, slot_key: e.target.value })}
                  placeholder="Slot Key를 입력하세요"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">시작일</label>
                <Input
                  type="date"
                  value={formData.start_date ?? ''}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">종료일</label>
                <Input
                  type="date"
                  value={formData.end_date ?? ''}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                />
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="text-blue-600">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="text-sm text-blue-800">
                  <strong>Surface:</strong> 히어로 (자동 설정)
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingId ? '수정' : '추가'}
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isPending}
              >
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 데이터 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">히어로 캐러셀 목록</h3>
          <p className="text-sm text-gray-600 mt-1">
            총 {slots.length}개의 항목
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">로딩 중...</span>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">항목이 없습니다</h3>
            <p className="text-gray-600 mb-4">새 항목을 추가해보세요.</p>
            <Button 
              onClick={handleAddNew}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              새 항목 추가
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sabre ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    호텔명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slot Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    생성일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {slots.map((slot) => (
                  <tr key={slot.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {slot.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                      {slot.sabre_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => handleHotelSearchOpen(slot.id)}
                        className="text-left hover:text-purple-600 hover:underline transition-colors cursor-pointer w-full"
                        title="호텔 검색하기"
                      >
                        {slot.select_hotels?.property_name_ko || '호텔 선택하기'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {slot.slot_key}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(slot.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpsert(slot)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(slot.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 호텔 검색 팝업 */}
      {showHotelSearch && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col border border-gray-200">
            {/* 팝업 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Search className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">호텔 검색</h3>
                </div>
                <button
                  onClick={handleHotelSearchClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 검색 입력 */}
            <div className="px-6 py-4 border-b border-gray-200">
              <Input
                type="text"
                placeholder="호텔명을 입력하세요..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  // 디바운싱 없이 즉시 검색
                  handleHotelSearch(e.target.value)
                }}
                className="w-full"
              />
            </div>

            {/* 검색 결과 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
              {searchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  <span className="ml-2 text-gray-600">검색 중...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? '검색 결과가 없습니다' : '호텔명을 입력해주세요'}
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery ? '다른 검색어로 시도해보세요.' : '검색할 호텔명을 입력하세요.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((hotel) => (
                    <button
                      key={hotel.sabre_id}
                      onClick={() => handleHotelSelect(hotel)}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {hotel.property_name_ko}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {hotel.property_name_en}
                          </div>
                        </div>
                        <div className="text-sm font-mono text-purple-600">
                          {hotel.sabre_id}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 팝업 푸터 */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleHotelSearchClose}
                >
                  닫기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
