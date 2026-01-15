"use client"

import React, { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { highlightRowFields } from '@/components/shared/field-highlight'
import { Button } from '@/components/ui/button'
import { saveSatisfactionSurvey, deleteSatisfactionSurvey } from '@/features/satisfaction-survey/actions'
import HotelQuickSearch from '@/components/shared/hotel-quick-search'
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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

type Row = Record<string, unknown>

type Hotel = {
  sabre_id: string
  property_name_ko: string | null
  property_name_en: string | null
}

// Sortable Row 컴포넌트
function SortableRow({ 
  row, 
  index, 
  columns, 
  pkField,
  formId,
  pkValue,
  isBooleanField,
  selectedHotels,
  setSelectedHotels,
  savingRecords,
  setSavingRecords,
  saveMutation,
  deleteMutation,
}: {
  row: Row
  index: number
  columns: string[]
  pkField: string
  formId: string
  pkValue: string
  isBooleanField: (field: string) => boolean
  selectedHotels: Record<string, Hotel>
  setSelectedHotels: React.Dispatch<React.SetStateAction<Record<string, Hotel>>>
  savingRecords: Set<string>
  setSavingRecords: React.Dispatch<React.SetStateAction<Set<string>>>
  saveMutation: any
  deleteMutation: any
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pkValue })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      data-pk={pkValue}
      className={cn(
        index % 2 === 1 ? 'bg-gray-50' : 'bg-white',
        'hover:bg-orange-50 transition-colors',
        isDragging && 'opacity-50'
      )}
    >
      {columns.map((c) => (
        <td key={`${pkValue}-${c}`} className="px-2 py-4">
          {c === 'sort' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-gray-200 rounded"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-4 w-4 text-gray-400" />
              </button>
              <input 
                name={c} 
                type="number"
                defaultValue={String(row[c] ?? '')}
                placeholder="순서"
                className="w-full rounded border px-2 py-1.5 text-sm text-center"
                form={formId}
              />
            </div>
          ) : c === 'id' ? (
            <div className="text-sm text-gray-600 font-mono text-center">{String(row[c] ?? '')}</div>
          ) : isBooleanField(c) ? (
            <select 
              name={c} 
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
              defaultValue={row[c] === true ? 'true' : row[c] === false ? 'false' : ''}
              form={formId}
            >
              {c === 'pick' ? (
                <>
                  <option value="">-</option>
                  <option value="true">선정</option>
                  <option value="false">미선정</option>
                </>
              ) : (
                <>
                  <option value="">-</option>
                  <option value="true">{c === 'satisfaction' ? '만족' : '제공'}</option>
                  <option value="false">{c === 'satisfaction' ? '불만족' : '미제공'}</option>
                </>
              )}
            </select>
          ) : c === 'review_text' ? (
            <textarea 
              name={c} 
              defaultValue={String(row[c] ?? '')}
              className="w-full rounded border px-2 py-1.5 text-sm min-h-[60px] resize-y"
              form={formId}
            />
          ) : c === 'submitted_at' ? (
            <input 
              type="datetime-local" 
              name={c} 
              defaultValue={row[c] ? new Date(String(row[c])).toISOString().slice(0, 16) : ''}
              className="w-full rounded border px-2 py-1.5 text-sm"
              form={formId}
            />
          ) : c === 'property_name_kr' ? (
            <div className="relative z-[90]">
              <HotelQuickSearch
                placeholder="호텔 검색..."
                initialQuery={`${String(row.property_name_kr || '')}${row.sabre_id ? ` (Sabre ID: ${String(row.sabre_id)})` : ''}`}
                onSelect={(hotel) => {
                  setSelectedHotels(prev => ({
                    ...prev,
                    [pkValue]: hotel
                  }))
                }}
              />
              <input 
                type="hidden" 
                name="sabre_id" 
                value={selectedHotels[pkValue]?.sabre_id || String(row.sabre_id ?? '')}
                form={formId}
              />
              <input 
                type="hidden" 
                name="property_name_kr" 
                value={selectedHotels[pkValue]?.property_name_ko || String(row[c] ?? '')}
                form={formId}
              />
              <input 
                type="hidden" 
                name="property_name_en" 
                value={selectedHotels[pkValue]?.property_name_en || String(row.property_name_en ?? '')}
                form={formId}
              />
            </div>
          ) : (
            <input 
              name={c} 
              defaultValue={String(row[c] ?? '')}
              type="text"
              className="w-full rounded border px-2 py-1.5 text-sm"
              form={formId}
            />
          )}
        </td>
      ))}
      <td className="px-2 py-4">
        <form
          id={formId}
          onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget as HTMLFormElement)
            console.log(`폼 제출 - ID: ${pkValue}`)
            
            setSavingRecords(prev => new Set(prev).add(pkValue))
            
            await saveMutation.mutateAsync(fd)
          }}
          className="flex flex-col gap-1"
        >
          <input type="hidden" name="id" value={pkValue} />
          <Button
            type="submit"
            size="xs"
            variant="default"
            disabled={savingRecords.has(pkValue)}
            className="w-full"
          >
            {savingRecords.has(pkValue) ? '저장 중' : '저장'}
          </Button>
          <Button
            type="button"
            size="xs"
            variant="destructive"
            onClick={async () => {
              const surveyId = Number(row[pkField])
              const bookingNumber = String(row.booking_number || surveyId)
              
              if (!confirm(`"${bookingNumber}" 설문 결과를 삭제하시겠습니까?`)) {
                return
              }
              
              try {
                await deleteMutation.mutateAsync(surveyId)
                alert('삭제되었습니다.')
              } catch (error) {
                console.error('Delete failed:', error)
                alert(`삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
              }
            }}
            disabled={deleteMutation.isPending}
            className="w-full"
          >
            {deleteMutation.isPending ? '삭제 중' : '삭제'}
          </Button>
        </form>
      </td>
    </tr>
  )
}

export function SatisfactionSurveyTable() {
  const [adding, setAdding] = useState(false)
  const [savingRecords, setSavingRecords] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()
  
  // 각 행의 선택된 호텔 정보 저장
  const [selectedHotels, setSelectedHotels] = useState<Record<string, Hotel>>({})
  
  // 드래그 앤 드롭을 위한 로컬 순서 상태
  const [localRows, setLocalRows] = useState<Row[]>([])
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 설문 결과 목록을 TanStack Query로 가져오기
  const { data: surveyData, isLoading, error } = useQuery({
    queryKey: ['satisfaction-survey-list'],
    queryFn: async () => {
      console.log('🔍 설문 결과 목록 조회 시작...')
      try {
        const response = await fetch('/api/satisfaction-survey/list')
        console.log('📡 API 응답 상태:', response.status, response.statusText)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ API 에러 응답:', errorText)
          throw new Error(`API Error: ${response.status} ${response.statusText}`)
        }
        
        const result = await response.json()
        console.log('✅ API 응답 데이터:', result)
        return result.data || []
      } catch (error) {
        console.error('❌ 설문 결과 조회 실패:', error)
        throw error
      }
    },
  })

  const rows: Row[] = useMemo(() => surveyData || [], [surveyData])
  
  // surveyData가 변경되면 localRows 업데이트
  React.useEffect(() => {
    if (surveyData) {
      setLocalRows(surveyData)
    }
  }, [surveyData])
  
  // 표시할 컬럼 순서 고정 (sort를 맨 앞으로, sabre_id 대신 property_name_kr 표시)
  const columns = ['sort', 'id', 'submitted_at', 'booking_number', 'property_name_kr', 'satisfaction', 'early_check_in', 'late_check_out', 'room_upgrade', 'pick', 'review_text']

  const pkField = 'id'
  
  // 드래그 종료 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) {
      return
    }
    
    const oldIndex = localRows.findIndex((r) => String(r.id) === String(active.id))
    const newIndex = localRows.findIndex((r) => String(r.id) === String(over.id))
    
    if (oldIndex === -1 || newIndex === -1) {
      return
    }
    
    // 로컬 상태 업데이트
    const reordered = arrayMove(localRows, oldIndex, newIndex)
    setLocalRows(reordered)
    
    // sort 값 일괄 업데이트
    try {
      const updates = reordered.map((row, index) => ({
        id: Number(row.id),
        sort: index + 1
      }))
      
      const response = await fetch('/api/satisfaction-survey/bulk-update-sort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })
      
      if (!response.ok) {
        throw new Error('정렬 순서 업데이트 실패')
      }
      
      // 쿼리 무효화하여 데이터 새로고침
      await queryClient.invalidateQueries({ queryKey: ['satisfaction-survey-list'] })
    } catch (error) {
      console.error('정렬 순서 업데이트 오류:', error)
      alert('정렬 순서 저장에 실패했습니다.')
      // 실패 시 원래 데이터로 복원
      if (surveyData) {
        setLocalRows(surveyData)
      }
    }
  }

  const deleteMutation = useMutation({
    mutationFn: async (surveyId: number) => {
      const result = await deleteSatisfactionSurvey(surveyId)
      
      if (!result.success) {
        throw new Error(result.error || 'Delete failed')
      }
      
      return result
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['satisfaction-survey-list'] })
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const pkValue = formData.get('id')
      console.log(`API 호출 - ID: ${pkValue}`)
      
      const result = await saveSatisfactionSurvey(formData)
      if (!result.success) throw new Error(result.error || 'save failed')
      return { formData, pkValue: String(pkValue) }
    },
    onSuccess: async ({ pkValue }) => {
      console.log(`저장 성공 - ID: ${pkValue}`)
      
      setSavingRecords(prev => {
        const newSet = new Set(prev)
        newSet.delete(pkValue)
        return newSet
      })
      
      await queryClient.invalidateQueries({ queryKey: ['satisfaction-survey-list'] })
      
      setTimeout(() => {
        const row = document.querySelector(`tr[data-pk="${pkValue}"]`)
        highlightRowFields(row, 'input, select, textarea')
      }, 100)
    },
    onError: (_error, variables) => {
      const formData = variables as FormData
      const pkValue = String(formData.get('id'))
      
      setSavingRecords(prev => {
        const newSet = new Set(prev)
        newSet.delete(pkValue)
        return newSet
      })
    },
  })

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await saveSatisfactionSurvey(formData)
      if (!result.success) throw new Error(result.error || 'create failed')
      return result
    },
    onSuccess: async () => {
      console.log('새 설문 결과 생성 성공')
      alert('새 설문 결과가 성공적으로 생성되었습니다.')
      setAdding(false)
      // 새 행 추가 시 선택된 호텔 정보 초기화
      setSelectedHotels(prev => {
        const newHotels = { ...prev }
        delete newHotels['new']
        return newHotels
      })
      await queryClient.invalidateQueries({ queryKey: ['satisfaction-survey-list'] })
    },
    onError: (error) => {
      console.error('새 설문 결과 생성 실패:', error)
      alert(`설문 결과 생성에 실패했습니다: ${error.message}`)
    },
  })

  // Boolean 필드인지 확인
  const isBooleanField = (field: string) => {
    return ['satisfaction', 'early_check_in', 'late_check_out', 'room_upgrade', 'pick'].includes(field)
  }

  // 컬럼 라벨 매핑
  const getColumnLabel = (column: string): string => {
    const labelMap: Record<string, string> = {
      id: 'ID',
      submitted_at: '제출 시간',
      booking_number: '예약 번호',
      property_name_kr: '호텔명',
      review_text: '리뷰 내용',
      satisfaction: '만족도',
      early_check_in: '얼리 체크인',
      late_check_out: '레이트 체크아웃',
      room_upgrade: '룸 업그레이드',
      pick: '선정',
      sort: '정렬 순서'
    }
    return labelMap[column] || column
  }

  // 컬럼 너비 설정
  const getColumnWidth = (column: string): string => {
    const widthMap: Record<string, string> = {
      sort: '120px',
      id: '70px',
      submitted_at: '180px',
      booking_number: '140px',
      property_name_kr: '220px',
      satisfaction: '100px',
      early_check_in: '120px',
      late_check_out: '120px',
      room_upgrade: '120px',
      pick: '90px',
      review_text: '350px'
    }
    return widthMap[column] || 'auto'
  }

  if (isLoading) {
    return <div className="p-4 text-center">로딩 중...</div>
  }

  if (error) {
    return <div className="rounded border bg-red-50 p-4 text-red-700">데이터를 불러오는데 실패했습니다.</div>
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white relative">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">고객 만족도 설문 결과</h2>
          <p className="text-xs text-muted-foreground">총 {rows.length}개</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium',
            adding ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-yellow-600 text-white hover:bg-yellow-700'
          )}
        >
          {adding ? '추가 취소' : '새 설문 결과 추가'}
        </button>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-y-visible min-h-[400px]">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                style={{ width: getColumnWidth(column), minWidth: getColumnWidth(column) }}
              >
                {getColumnLabel(column)}
              </th>
            ))}
            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" style={{ width: '140px' }}>
              작업
            </th>
          </tr>
          </thead>
          <SortableContext
            items={localRows.map((r) => String(r.id))}
            strategy={verticalListSortingStrategy}
          >
            <tbody className="bg-white divide-y divide-gray-100">
          {/* 새 행 추가 */}
          {adding && (
            <tr className="bg-yellow-50/40">
              <td className="px-2 py-4 text-center text-xs text-gray-400">자동</td>
              {columns.filter(c => c !== 'id').map((c) => (
                <td key={`new-${c}`} className="px-2 py-4">
                  {isBooleanField(c) ? (
                    <select 
                      name={c} 
                      className="w-full rounded border px-2 py-1.5 text-sm"
                      defaultValue=""
                      form="new-row-form"
                    >
                      {c === 'pick' ? (
                        <>
                          <option value="">-</option>
                          <option value="true">선정</option>
                          <option value="false">미선정</option>
                        </>
                      ) : (
                        <>
                          <option value="">-</option>
                          <option value="true">{c === 'satisfaction' ? '만족' : '제공'}</option>
                          <option value="false">{c === 'satisfaction' ? '불만족' : '미제공'}</option>
                        </>
                      )}
                    </select>
                  ) : c === 'review_text' ? (
                    <textarea 
                      name={c} 
                      placeholder="리뷰 입력"
                      className="w-full rounded border px-2 py-1.5 text-sm min-h-[60px] resize-y"
                      form="new-row-form"
                    />
                  ) : c === 'submitted_at' ? (
                    <input 
                      type="datetime-local" 
                      name={c} 
                      className="w-full rounded border px-2 py-1.5 text-sm"
                      form="new-row-form"
                      defaultValue={new Date().toISOString().slice(0, 16)}
                    />
                  ) : c === 'property_name_kr' ? (
                    <div className="relative z-[90]">
                        <HotelQuickSearch
                          placeholder="호텔 검색..."
                          onSelect={(hotel) => {
                          setSelectedHotels(prev => ({
                            ...prev,
                            'new': hotel
                          }))
                        }}
                      />
                        {selectedHotels['new'] && (
                          <>
                            <input type="hidden" name="sabre_id" value={selectedHotels['new'].sabre_id} form="new-row-form" />
                            <input type="hidden" name="property_name_kr" value={selectedHotels['new'].property_name_ko || ''} form="new-row-form" />
                            <input type="hidden" name="property_name_en" value={selectedHotels['new'].property_name_en || ''} form="new-row-form" />
                          </>
                        )}
                    </div>
                  ) : c === 'sort' ? (
                    <input 
                      name={c} 
                      type="number"
                      placeholder="순서"
                      className="w-full rounded border px-2 py-1.5 text-sm"
                      form="new-row-form"
                    />
                  ) : (
                    <input 
                      name={c} 
                      placeholder={c === 'booking_number' ? '예약 번호' : ''}
                      type="text"
                      className="w-full rounded border px-2 py-1.5 text-sm"
                      form="new-row-form"
                    />
                  )}
                </td>
              ))}
              <td className="px-2 py-4">
                <form 
                  id="new-row-form"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const fd = new FormData(e.currentTarget as HTMLFormElement)
                    await createMutation.mutateAsync(fd)
                  }}
                  className="flex flex-col gap-1 justify-center"
                >
                  <Button
                    type="submit"
                    size="xs"
                    variant="default"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? '생성 중' : '생성'}
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      setAdding(false)
                      setSelectedHotels(prev => {
                        const newHotels = { ...prev }
                        delete newHotels['new']
                        return newHotels
                      })
                    }}
                    disabled={createMutation.isPending}
                  >
                    취소
                  </Button>
                </form>
              </td>
            </tr>
          )}

          {/* 기존 행 - 드래그 앤 드롭 가능 */}
          {localRows.map((r, idx) => {
            const formId = `row-form-${String(r[pkField])}`
            const pkValue = String(r[pkField])
            
            return (
              <SortableRow
                key={pkValue}
                row={r}
                index={idx}
                columns={columns}
                pkField={pkField}
                formId={formId}
                pkValue={pkValue}
                isBooleanField={isBooleanField}
                selectedHotels={selectedHotels}
                setSelectedHotels={setSelectedHotels}
                savingRecords={savingRecords}
                setSavingRecords={setSavingRecords}
                saveMutation={saveMutation}
                deleteMutation={deleteMutation}
              />
            )
          })}

          {localRows.length === 0 && !adding && (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-sm text-muted-foreground">
                데이터가 없습니다. 새 설문 결과 추가를 눌러 항목을 등록하세요.
              </td>
            </tr>
          )}
            </tbody>
          </SortableContext>
          </table>
        </div>
      </DndContext>
    </div>
  )
}
