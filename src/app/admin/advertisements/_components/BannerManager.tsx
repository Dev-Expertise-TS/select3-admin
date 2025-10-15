'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Trash2,
  Plus,
  Image as ImageIcon,
  Save,
  GripVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { saveFeatureSlot, deleteFeatureSlot } from '@/features/advertisements/actions'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface FeatureSlot {
  id: number
  sabre_id: string
  surface: string
  slot_key: string
  start_date?: string
  end_date?: string
  created_at: string
  select_hotels: {
    property_name_ko: string
    property_name_en: string
    slug: string
  }
  hotel_image?: string
}


interface Hotel {
  sabre_id: string
  property_name_ko: string
  property_name_en: string
  slug?: string
  image_1?: string
  image_2?: string
  image_3?: string
  image_4?: string
  image_5?: string
  brand_id?: string
  hotel_brands?: {
    brand_id: string
    brand_name_ko: string
    brand_name_en: string
    chain_id: string
    hotel_chains?: {
      chain_id: string
      chain_name_ko: string
      chain_name_en: string
    }
  }
}

// 종료일이 지났는지 확인하는 함수 (한국 시간 기준)
function isExpired(endDate?: string): boolean {
  if (!endDate) return false
  
  const now = new Date()
  const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const koreaDate = koreaTime.toISOString().split('T')[0] // YYYY-MM-DD
  
  return endDate < koreaDate
}

// 드래그 가능한 행 컴포넌트
function SortableRow({ 
  slot, 
  isPending,
  onUpdate, 
  onSave, 
  onDelete 
}: { 
  slot: FeatureSlot
  isPending: boolean
  onUpdate: (id: number, field: string, value: string) => void
  onSave: (slot: FeatureSlot) => void
  onDelete: (slot: FeatureSlot) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slot.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const expired = isExpired(slot.end_date)

  return (
    <tr 
      ref={setNodeRef} 
      style={style}
      className={`border-b border-gray-200 ${expired ? 'bg-gray-100 opacity-60' : 'bg-white'} ${isDragging ? 'shadow-lg' : ''}`}
    >
      {/* 드래그 핸들 */}
      <td className="px-4 py-4 text-center">
        <div {...attributes} {...listeners} className="cursor-move">
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
      </td>
      
      {/* 호텔 이미지 */}
      <td className="px-4 py-4">
        <div className="w-16 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
          {slot.hotel_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slot.hotel_image}
              alt={`${slot.select_hotels?.property_name_ko || '호텔'} 이미지`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                if (target.parentElement) {
                  target.parentElement.innerHTML = '<div class="flex items-center justify-center text-gray-400 text-xs">이미지 없음</div>';
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center text-gray-400 text-xs">
              이미지 없음
            </div>
          )}
        </div>
      </td>
      
      {/* 호텔명 */}
      <td className="px-4 py-4">
        <div>
          <div className={`font-medium ${expired ? 'text-gray-600' : 'text-gray-900'}`}>
            {slot.select_hotels?.property_name_ko || '-'}
          </div>
          <div className="text-sm text-gray-500">
            {slot.select_hotels?.property_name_en || '-'}
          </div>
        </div>
      </td>
      
      {/* Sabre ID */}
      <td className="px-4 py-4">
        <span className={`font-mono text-sm ${expired ? 'text-gray-500' : 'text-gray-600'}`}>
          {slot.sabre_id}
        </span>
      </td>
      
      {/* 슬롯 키 */}
      <td className="px-4 py-4">
        <Input 
          type="text" 
          value={slot.slot_key} 
          onChange={(e) => onUpdate(slot.id, 'slot_key', e.target.value)} 
          className="w-24"
          disabled={expired}
        />
      </td>
      
      {/* 시작일 */}
      <td className="px-4 py-4">
        <Input 
          type="date" 
          value={slot.start_date ?? ''} 
          onChange={(e) => onUpdate(slot.id, 'start_date', e.target.value)} 
          className="w-36"
          disabled={expired}
        />
      </td>
      
      {/* 종료일 */}
      <td className="px-4 py-4">
        <Input 
          type="date" 
          value={slot.end_date ?? ''} 
          onChange={(e) => onUpdate(slot.id, 'end_date', e.target.value)} 
          className="w-36"
          disabled={expired}
        />
      </td>
      
      {/* 생성일 */}
      <td className="px-4 py-4">
        <span className="text-sm text-gray-500">
          {slot.created_at ? new Date(slot.created_at).toLocaleDateString('ko-KR') : '-'}
        </span>
      </td>
      
      {/* 작업 */}
      <td className="px-4 py-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSave(slot)}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={isPending || expired}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            <Save className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(slot)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={isPending}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

export default function BannerManager() {
  const [slots, setSlots] = useState<FeatureSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // 새 항목 추가 폼 상태
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    sabre_id: '',
    start_date: '',
    end_date: ''
  })
  
  // 호텔 검색 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Hotel[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  
  // Server Actions을 위한 transition
  const [isPending, startTransition] = useTransition()
  
  // DnD 센서
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  

  // 호텔 이미지 가져오기
  const fetchHotelImage = async (sabreId: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/hotel/first-image?sabreId=${sabreId}`)
      const data = await response.json()
      
      if (data.success && data.data.imageUrl) {
        return data.data.imageUrl
      }
      return null
    } catch (error) {
      console.error(`호텔 ${sabreId} 이미지 조회 오류:`, error)
      return null
    }
  }

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
        // 배열 데이터 처리 (여러 상단 베너 스케줄)
        const bannerSlots = data.data || []
        
        // 날짜 정규화 함수
        const normalizeDate = (d?: string | null) => {
          if (!d) return undefined
          const dt = new Date(d)
          if (Number.isNaN(dt.getTime())) return undefined
          return dt.toISOString().slice(0, 10)
        }
        
        // 각 슬롯에 호텔 이미지 추가 및 날짜 정규화
        const slotsWithImages = await Promise.all(
          bannerSlots.map(async (slot: Record<string, unknown>) => {
            const imageUrl = await fetchHotelImage(String(slot.sabre_id))
            return { 
              ...slot, 
              hotel_image: imageUrl,
              start_date: normalizeDate(typeof slot.start_date === 'string' ? slot.start_date : undefined),
              end_date: normalizeDate(typeof slot.end_date === 'string' ? slot.end_date : undefined)
            } as FeatureSlot
          })
        )
        
        setSlots(slotsWithImages)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  // 새 항목 추가
  const handleAddNew = () => {
    setShowForm(true)
    setFormData({
      sabre_id: '',
      start_date: '',
      end_date: ''
    })
  }


  // 인라인 저장 (PromotionManager의 handleUpsert와 동일한 방식)
  const saveInline = async (slot: FeatureSlot) => {
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      try {
        // FormData 생성
        const formData = new FormData()
        formData.append('id', String(slot.id))
        formData.append('sabre_id', slot.sabre_id)
        formData.append('surface', '상단베너')
        formData.append('slot_key', 'top-banner')
        formData.append('start_date', slot.start_date || '')
        formData.append('end_date', slot.end_date || '')

        const result = await saveFeatureSlot(formData)
        
        if (!result.success) {
          throw new Error(result.error || '저장에 실패했습니다.')
        }
        
        setSuccess('저장되었습니다.')
        loadSlots()
        
        // 성공 메시지 3초 후 자동 숨김
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
      }
    })
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
    // 선택한 호텔명을 검색 필드에 표시
    setSearchQuery(hotel.property_name_ko || hotel.property_name_en || '')
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

  // 삭제
  const handleDelete = async (slot: FeatureSlot) => {
    if (!confirm('정말로 상단 베너를 삭제하시겠습니까?')) {
      return
    }

    startTransition(async () => {
      try {
        const result = await deleteFeatureSlot(slot.id)

        if (!result.success) {
          throw new Error(result.error || '삭제에 실패했습니다.')
        }

        setSuccess('상단 베너가 삭제되었습니다.')
        loadSlots()
      } catch (err) {
        setError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.')
      }
    })
  }

  // 슬롯 필드 업데이트
  const updateSlotField = (id: number, field: string, value: string) => {
    setSlots(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value || undefined }
      }
      return s
    }))
  }

  // 드래그 종료 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = slots.findIndex(s => s.id === active.id)
    const newIndex = slots.findIndex(s => s.id === over.id)

    const reorderedSlots = arrayMove(slots, oldIndex, newIndex)
    
    // 순서에 따라 slot_key를 1부터 순차적으로 업데이트
    const updatedSlots = reorderedSlots.map((slot, index) => ({
      ...slot,
      slot_key: String(index + 1)
    }))

    setSlots(updatedSlots)

    // 서버에 변경사항 저장
    startTransition(async () => {
      try {
        // 각 슬롯의 slot_key를 업데이트
        const updatePromises = updatedSlots.map(async (slot) => {
          const formData = new FormData()
          formData.append('id', String(slot.id))
          formData.append('sabre_id', slot.sabre_id)
          formData.append('surface', '상단베너')
          formData.append('slot_key', slot.slot_key)
          formData.append('start_date', slot.start_date || '')
          formData.append('end_date', slot.end_date || '')

          return saveFeatureSlot(formData)
        })

        const results = await Promise.all(updatePromises)
        
        const failed = results.find(r => !r.success)
        if (failed) {
          throw new Error(failed.error || '순서 저장에 실패했습니다.')
        }

        setSuccess('순서가 저장되었습니다.')
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : '순서 저장 중 오류가 발생했습니다.')
        // 에러 발생 시 원래 데이터로 복원
        loadSlots()
      }
    })
  }


  return (
    <div className="space-y-6">
      {/* 헤더 (복원) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <ImageIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              호텔 목록 메인 베너 노출 관리
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              select_feature_slots 테이블의 surface가 &apos;상단베너&apos;인 레코드를 관리합니다
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

      {/* 폼 제거: 인라인 편집으로 대체 */}

      {/* 선택 패널 제거: 인라인 편집으로 대체 */}

      {/* 메인 베너 노출 호텔 추가 버튼 */}
      <div className="flex justify-end mb-4">
        <Button
          onClick={handleAddNew}
          disabled={showForm}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          메인 베너 노출 호텔 추가
        </Button>
      </div>

      {/* 새 항목 추가 폼 */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            메인 베너 노출 호텔 추가
          </h3>
          
          <form onSubmit={async (e) => {
            e.preventDefault()
            
            const sabreId = String(formData.sabre_id || '').trim()
            if (!sabreId) {
              setError('호텔을 선택해주세요.')
              return
            }

            setError(null)
            setSuccess(null)

            startTransition(async () => {
              try {
                const formDataToSubmit = new FormData()
                formDataToSubmit.append('sabre_id', sabreId)
                formDataToSubmit.append('surface', '상단베너')
                formDataToSubmit.append('slot_key', 'top-banner')
                formDataToSubmit.append('start_date', formData.start_date || '')
                formDataToSubmit.append('end_date', formData.end_date || '')

                const result = await saveFeatureSlot(formDataToSubmit)
                
                if (!result.success) {
                  throw new Error(result.error || '저장에 실패했습니다.')
                }
                
                setSuccess('저장되었습니다.')
                setShowForm(false)
                setFormData({
                  sabre_id: '',
                  start_date: '',
                  end_date: ''
                })
                loadSlots()
                
                // 성공 메시지 3초 후 자동 숨김
                setTimeout(() => setSuccess(null), 3000)
              } catch (err) {
                setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
              }
            })
          }} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  호텔명 또는 Sabre ID*
                </label>
                <div className="relative">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={formData.sabre_id ? "호텔이 선택되었습니다" : "호텔명을 입력하여 검색하세요..."}
                    className="w-full"
                  />
                  {searchLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                  
                  {/* 검색 결과 드롭다운 */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((hotel) => (
                        <div
                          key={hotel.sabre_id}
                          className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                          onClick={() => selectHotel(hotel)}
                        >
                          <div className="font-medium text-gray-900">
                            {hotel.property_name_ko}
                          </div>
                          <div className="text-sm text-gray-500">
                            {hotel.property_name_en}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            Sabre ID: {hotel.sabre_id}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sabre ID
                </label>
                <Input
                  value={formData.sabre_id}
                  onChange={(e) => setFormData({ ...formData, sabre_id: e.target.value })}
                  placeholder="Sabre ID"
                  readOnly
                  className="bg-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">시작일</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">종료일</label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="text-blue-600">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div className="text-sm text-blue-800">
                  <strong>Surface:</strong> 상단베너 (자동 설정)
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    추가
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={isPending}
              >
                취소
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 드래그 가능한 데이터 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">상단 베너 슬롯 목록</h3>
              <p className="text-sm text-gray-600 mt-1">총 {slots.length}개의 항목 • 드래그하여 순서 변경</p>
            </div>
          </div>
        </div>

        {/* 로딩 상태 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">로딩 중...</span>
          </div>
        ) : slots.length === 0 ? (
          /* 빈 상태 */
          <div className="text-center py-12">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              항목이 없습니다
            </h3>
            <p className="text-gray-600 mb-4">
              새 항목을 추가해보세요.
            </p>
          </div>
        ) : (
          /* 드래그 가능한 테이블 */
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      순서
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      호텔 이미지
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      호텔명
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Sabre ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      슬롯 키
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                      노출 시작일
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                      노출 종료일
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      생성일
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <SortableContext
                    items={slots.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {slots.map((slot) => (
                      <SortableRow
                        key={slot.id}
                        slot={slot}
                        isPending={isPending}
                        onUpdate={updateSlotField}
                        onSave={saveInline}
                        onDelete={handleDelete}
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  )
}
