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
  Search,
  GripVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import HotelQuickSearch from '@/components/shared/hotel-quick-search'
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

// 종료일이 지났는지 확인하는 함수 (한국 시간 기준)
function isExpired(endDate?: string | null): boolean {
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
  onDelete,
  onHotelSearchOpen
}: { 
  slot: FeatureSlot
  isPending: boolean
  onUpdate: (id: number, field: string, value: string) => void
  onSave: (slot: FeatureSlot) => void
  onDelete: (id: number) => void
  onHotelSearchOpen: (id: number) => void
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
        <div {...attributes} {...listeners} className="cursor-move inline-flex">
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
      </td>
      
      {/* ID */}
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        {slot.id}
      </td>
      
      {/* Sabre ID */}
      <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
        {slot.sabre_id}
      </td>
      
      {/* 호텔명 */}
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        <button
          onClick={() => onHotelSearchOpen(slot.id)}
          className={`text-left hover:text-purple-600 hover:underline transition-colors cursor-pointer w-full ${expired ? 'text-gray-500' : 'text-gray-900'}`}
          title="호텔 검색하기"
          disabled={expired}
        >
          {slot.select_hotels?.property_name_ko || '호텔 선택하기'}
        </button>
      </td>
      
      {/* Slot Key */}
      <td className="px-4 py-4 whitespace-nowrap">
        <Input 
          type="text" 
          value={slot.slot_key} 
          onChange={(e) => onUpdate(slot.id, 'slot_key', e.target.value)} 
          className="w-24"
          disabled={expired}
        />
      </td>
      
      {/* 시작일 */}
      <td className="px-4 py-4 whitespace-nowrap">
        <Input 
          type="date" 
          value={slot.start_date ?? ''} 
          onChange={(e) => onUpdate(slot.id, 'start_date', e.target.value)} 
          className="w-36"
          disabled={expired}
        />
      </td>
      
      {/* 종료일 */}
      <td className="px-4 py-4 whitespace-nowrap">
        <Input 
          type="date" 
          value={slot.end_date ?? ''} 
          onChange={(e) => onUpdate(slot.id, 'end_date', e.target.value)} 
          className="w-36"
          disabled={expired}
        />
      </td>
      
      {/* 생성일 */}
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(slot.created_at).toLocaleDateString('ko-KR')}
      </td>
      
      {/* 작업 */}
      <td className="px-4 py-4 whitespace-nowrap">
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
            onClick={() => onDelete(slot.id)}
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

  // DnD 센서
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 데이터 로드
  const loadSlots = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/feature-slots?surface=히어로')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '데이터를 불러올 수 없습니다.')
      }

      if (data.success) {
        // 날짜 정규화 함수
        const normalizeDate = (d?: string | null) => {
          if (!d) return undefined
          const dt = new Date(d)
          if (Number.isNaN(dt.getTime())) return undefined
          return dt.toISOString().slice(0, 10)
        }
        
        const rows: FeatureSlot[] = (data.data || []).map((s: Record<string, unknown>) => ({
          id: s.id,
          sabre_id: s.sabre_id,
          surface: s.surface,
          slot_key: s.slot_key,
          start_date: normalizeDate(s.start_date),
          end_date: normalizeDate(s.end_date),
          created_at: s.created_at,
          select_hotels: { property_name_ko: s.select_hotels?.property_name_ko }
        }))
        
        // slot_key 순서대로 정렬 (숫자로 변환하여 비교)
        rows.sort((a, b) => {
          const keyA = parseInt(a.slot_key) || 0
          const keyB = parseInt(b.slot_key) || 0
          return keyA - keyB
        })
        
        setSlots(rows)
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

    startTransition(async () => {
      try {
        // FormData 생성
        const formData = new FormData()
        formData.append('id', String(slot.id))
        formData.append('sabre_id', slot.sabre_id)
        formData.append('surface', '히어로')
        formData.append('slot_key', slot.slot_key)
        formData.append('start_date', slot.start_date || '')
        formData.append('end_date', slot.end_date || '')

        const result = await saveFeatureSlot(formData)

        if (!result.success) {
          throw new Error(result.error || '저장 중 오류가 발생했습니다.')
        }

        setSuccess('데이터가 성공적으로 저장되었습니다.')
        loadSlots()
        
        // 성공 메시지 3초 후 자동 숨김
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
      }
    })
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
        form.append('surface', '히어로')
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
          formData.append('surface', '히어로')
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

      {/* 드래그 가능한 데이터 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">히어로 캐러셀 목록</h3>
          <p className="text-sm text-gray-600 mt-1">
            총 {slots.length}개의 항목 • 드래그하여 순서 변경
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Sabre ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      호텔명
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Slot Key
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                      시작일
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                      종료일
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
                        onSave={handleUpsert}
                        onDelete={handleDelete}
                        onHotelSearchOpen={handleHotelSearchOpen}
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
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
