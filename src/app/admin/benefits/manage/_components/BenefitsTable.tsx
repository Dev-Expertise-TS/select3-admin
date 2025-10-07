"use client"

import React, { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import DateInput from '@/components/shared/date-input'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { highlightRowFields } from '@/components/shared/field-highlight'
import { Button } from '@/components/ui/button'
import { saveBenefit, deleteBenefit } from '@/features/benefits/actions'

type Row = Record<string, unknown>

export interface BenefitsTableProps {
  createAction?: (formData: FormData) => Promise<void>
}

export function BenefitsTable({ createAction: _createAction }: BenefitsTableProps) {
  const [adding, setAdding] = useState(false)
  const [savingRecords, setSavingRecords] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  // 혜택 목록을 TanStack Query로 가져오기
  const { data: benefitsData, isLoading, error } = useQuery({
    queryKey: ['benefits-list'],
    queryFn: async () => {
      const response = await fetch('/api/benefits/list')
      if (!response.ok) throw new Error('Failed to fetch benefits')
      const result = await response.json()
      return result.data || []
    },
  })

  // 데이터 처리 로직
  const rows: Row[] = useMemo(() => benefitsData || [], [benefitsData])
  
  const originalColumns = useMemo(() => {
    return rows[0] ? Object.keys(rows[0]) : ['benefit', 'name', 'description']
  }, [rows])
  
  const pkCandidates = ['id', 'benefit_id', 'uuid', 'code', 'key', 'pk', 'benefit']
  const pkField = pkCandidates.find((k) => originalColumns.includes(k)) || originalColumns[0]
  
  // benefit_id를 맨 앞에 표시하기 위해 컬럼 순서 조정
  const excludeSet = new Set<string>(['created_at', pkField])
  const otherColumns = originalColumns.filter((c) => !excludeSet.has(c))
  
  // benefit_id가 있으면 맨 앞에, 없으면 기존 순서 유지
  const columns = useMemo(() => {
    return originalColumns.includes('benefit_id') 
      ? ['benefit_id', ...otherColumns.filter(c => c !== 'benefit_id')]
      : otherColumns
  }, [originalColumns, otherColumns])

  const deleteMutation = useMutation({
    mutationFn: async (params: { pkField: string; pkValue: string }) => {
      console.log('Delete mutation called with:', params)
      const benefitId = Number(params.pkValue)
      
      const result = await deleteBenefit(benefitId)
      console.log('Delete response:', result)
      
      if (!result.success) {
        throw new Error(result.error || 'Delete failed')
      }
      
      return result
    },
    onSuccess: async (result) => {
      console.log('Delete successful:', result)
      await queryClient.invalidateQueries({ queryKey: ['benefits-list'] })
    },
    onError: (error) => {
      console.error('Delete mutation error:', error)
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const pkValue = formData.get('pkValue')
      const pkField = formData.get('pkField')
      console.log(`API 호출 - ${pkField}: ${pkValue}`)
      
      const result = await saveBenefit(formData)
      if (!result.success) throw new Error(result.error || 'save failed')
      return { formData, pkValue: String(pkValue) }
    },
    onSuccess: async ({ formData, pkValue }) => {
      console.log(`저장 성공 - PK: ${pkValue}`)
      
      // 저장 성공 알림
      alert(`혜택이 성공적으로 저장되었습니다. (ID: ${pkValue})`)
      
      // 해당 레코드의 저장 상태 제거
      setSavingRecords(prev => {
        const newSet = new Set(prev)
        newSet.delete(pkValue)
        return newSet
      })
      
      await queryClient.invalidateQueries({ queryKey: ['benefits-list'] })
      // 저장된 행 하이라이트 (약간의 지연 후 DOM 업데이트 대기)
      setTimeout(() => {
        const pkValue = formData.get(pkField)
        if (pkValue) {
          const row = document.querySelector(`tr[data-pk="${pkValue}"]`)
          highlightRowFields(row, 'input, select, textarea')
        }
      }, 100)
    },
    onError: (error, variables) => {
      const formData = variables as FormData
      const pkValue = String(formData.get('pkValue'))
      console.error(`저장 실패 - PK: ${pkValue}`, error)
      
      // 에러 발생 시에도 해당 레코드의 저장 상태 제거
      setSavingRecords(prev => {
        const newSet = new Set(prev)
        newSet.delete(pkValue)
        return newSet
      })
    },
  })

  const isDateField = (field: string) => field === 'start_date' || field === 'end_date'
  const toDateInputValue = (value: unknown): string => {
    if (value == null) return ''
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
      const parsed = new Date(value)
      if (Number.isNaN(parsed.getTime())) return ''
      const iso = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())).toISOString()
      return iso.slice(0, 10)
    }
    if (typeof value === 'number') {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      const iso = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString()
      return iso.slice(0, 10)
    }
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return ''
      const iso = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())).toISOString()
      return iso.slice(0, 10)
    }
    return ''
  }

  const dateFields = useMemo(() => columns.filter((c) => isDateField(c)), [columns])
  const otherFields = useMemo(() => columns.filter((c) => !isDateField(c)), [columns])

  // 새 행 추가를 위한 mutation
  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await saveBenefit(formData)
      if (!result.success) throw new Error(result.error || 'create failed')
      return result
    },
    onSuccess: async () => {
      console.log('새 혜택 생성 성공')
      alert('새 혜택이 성공적으로 생성되었습니다.')
      setAdding(false)
      await queryClient.invalidateQueries({ queryKey: ['benefits-list'] })
    },
    onError: (error) => {
      console.error('새 혜택 생성 실패:', error)
      alert(`혜택 생성에 실패했습니다: ${error.message}`)
    },
  })

  // 로딩 및 에러 상태 처리
  if (isLoading) {
    return <div className="p-4 text-center">로딩 중...</div>
  }

  if (error) {
    return <div className="rounded border bg-red-50 p-4 text-red-700">데이터를 불러오는데 실패했습니다.</div>
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">Benefits 관리</h2>
          <p className="text-xs text-muted-foreground">총 {rows.length}개</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium',
            adding ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          {adding ? '추가 취소' : '새 행 추가'}
        </button>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column === 'benefit_id' ? 'ID' : 
                 column === 'benefit' ? '혜택명' : 
                 column === 'benefit_description' ? '설명' : 
                 column === 'start_date' ? '시작일' :
                 column === 'end_date' ? '종료일' : column}
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              작업
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {adding && (
            <tr className="bg-blue-50/40 hover:bg-orange-100 transition-colors">
              <td colSpan={columns.length + 1} className="px-4 py-3">
                <form 
                  id="new-row-form"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const fd = new FormData(e.currentTarget as HTMLFormElement)
                    await createMutation.mutateAsync(fd)
                  }}
                >
                  {/* 모든 필드를 한 줄에 고정 간격으로 배치 */}
                  <div className="flex items-center gap-4">
                    {/* benefit_id 필드 (맨 앞에 표시) */}
                    {columns.includes('benefit_id') && (
                      <div className="flex items-center gap-2">
                        <label className="w-16 shrink-0 text-xs text-gray-600 text-right">ID</label>
                        <input 
                          name="benefit_id" 
                          placeholder="자동 생성" 
                          className="w-20 rounded border px-2 py-1 text-sm bg-gray-100" 
                          readOnly
                        />
                      </div>
                    )}
                    {/* 기타 필드 (benefit, description 등) */}
                    {otherFields.filter(c => c !== 'benefit_id').map((c) => {
                      const labelText = c === 'benefit' ? '혜택' : c === 'benefit_description' ? '설명' : c
                      const inputStyle = c === 'benefit' ? { width: '200px' } : c === 'benefit_description' ? { width: '250px' } : {}
                      const inputWidth = c === 'benefit' || c === 'benefit_description' ? '' : 'w-36'
                      return (
                        <div key={`new-${c}`} className="flex items-center gap-2">
                          <label className="w-16 shrink-0 text-xs text-gray-600 text-right">{labelText}</label>
                          <input 
                            name={c} 
                            placeholder={c} 
                            style={inputStyle}
                            className={`${inputWidth} rounded border px-2 py-1 text-sm`} 
                          />
                        </div>
                      )
                    })}
                    {/* 날짜 필드 (라벨 제거하고 플레이스홀더로 구분) */}
                    {dateFields.map((c) => (
                      <div key={`new-${c}`} className="flex items-center">
                        <DateInput 
                          name={c} 
                          placeholderText={c === 'start_date' ? '시작 날짜' : c === 'end_date' ? '종료 날짜' : '날짜 선택'}
                          className="w-32"
                        />
                      </div>
                    ))}
                    {/* 저장/취소 버튼 */}
                    <div className="flex items-center gap-2 ml-auto">
                      <Button
                        type="submit"
                        size="xs"
                        variant="teal"
                        disabled={createMutation.isPending}
                      >
                        {createMutation.isPending ? '생성 중...' : '생성'}
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() => setAdding(false)}
                        disabled={createMutation.isPending}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                </form>
              </td>
            </tr>
          )}

          {rows.map((r, idx) => {
            const formId = `row-form-${String(r[pkField])}`
            return (
              <tr
                key={`${String(r[pkField])}-${idx}`}
                data-pk={String(r[pkField])}
                className={`${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'} hover:bg-orange-100 transition-colors`}
              >
                <td colSpan={columns.length + 1} className="px-4 py-3 text-sm align-top">
                  <form
                    id={formId}
                    className="space-y-3"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      const fd = new FormData(e.currentTarget as HTMLFormElement)
                      const pkValue = String(fd.get('pkValue'))
                      console.log(`폼 제출 - PK: ${pkValue}`)
                      
                      // 해당 레코드를 저장 중 상태로 설정
                      setSavingRecords(prev => new Set(prev).add(pkValue))
                      
                      await saveMutation.mutateAsync(fd)
                    }}
                  >
                    <input type="hidden" name="pkField" value={pkField} />
                    <input type="hidden" name="pkValue" value={String(r[pkField])} />
                    {/* 모든 필드를 한 줄에 고정 간격으로 배치 */}
                    <div className="flex items-center gap-4">
                      {/* benefit_id 필드 (맨 앞에 표시) */}
                      {columns.includes('benefit_id') && (
                        <div className="flex items-center gap-2">
                          <label className="w-16 shrink-0 text-xs text-gray-600 text-right">ID</label>
                          <input 
                            name="benefit_id" 
                            defaultValue={String(r.benefit_id ?? '')}
                            className="w-20 rounded border px-2 py-1 text-sm bg-gray-100" 
                            readOnly
                          />
                        </div>
                      )}
                      {/* 기타 필드 (benefit, description 등) */}
                      {otherFields.filter(c => c !== 'benefit_id').map((c) => {
                        const labelText = c === 'benefit' ? '혜택' : c === 'benefit_description' ? '설명' : c
                        const inputStyle = c === 'benefit' ? { width: '200px' } : c === 'benefit_description' ? { width: '250px' } : {}
                        const inputWidth = c === 'benefit' || c === 'benefit_description' ? '' : 'w-36'
                        return (
                          <div key={`${String(r[pkField])}-${c}`} className="flex items-center gap-2">
                            <label className="w-16 shrink-0 text-xs text-gray-600 text-right">{labelText}</label>
                            <input 
                              name={c} 
                              defaultValue={String(r[c] ?? '')} 
                              style={inputStyle}
                              className={`${inputWidth} rounded border px-2 py-1 text-sm`} 
                            />
                          </div>
                        )
                      })}
                      {/* 날짜 필드 (라벨 제거하고 플레이스홀더로 구분) */}
                      {dateFields.map((c) => (
                        <div key={`${String(r[pkField])}-${c}`} className="flex items-center">
                          <DateInput 
                            name={c} 
                            defaultValue={toDateInputValue(r[c])} 
                            placeholderText={c === 'start_date' ? '시작 날짜' : c === 'end_date' ? '종료 날짜' : '날짜 선택'}
                            className="w-32"
                          />
                        </div>
                      ))}
                      {/* 저장/삭제 버튼 */}
                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          type="submit"
                          size="xs"
                          variant="teal"
                          disabled={savingRecords.has(String(r[pkField]))}
                          data-pk={String(r[pkField])}
                          onClick={() => {
                            console.log(`저장 버튼 클릭 - PK: ${r[pkField]}`)
                            // 이벤트가 폼 제출을 막지 않도록 함
                          }}
                        >
                          {savingRecords.has(String(r[pkField])) ? '저장 중...' : '저장'}
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="destructive"
                          onClick={async () => {
                            const pkValue = String(r[pkField])
                            const benefitName = String(r.name || r.benefit || pkValue)
                            
                            // 삭제 확인
                            if (!confirm(`"${benefitName}" 혜택을 삭제하시겠습니까?\n\n⚠️ 이 혜택을 사용하는 모든 호텔 매핑도 함께 삭제됩니다.`)) {
                              return
                            }
                            
                            try {
                              await deleteMutation.mutateAsync({ pkField, pkValue })
                              alert('삭제되었습니다.')
                            } catch (error) {
                              console.error('Delete failed:', error)
                              alert(`삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? '삭제 중...' : '삭제'}
                        </Button>
                      </div>
                    </div>
                  </form>
                  {/* 삭제/저장은 useMutation으로 처리되므로 별도 폼 불필요 */}
                </td>
              </tr>
            )
          })}

          {rows.length === 0 && !adding && (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-sm text-muted-foreground">
                데이터가 없습니다. 새 행 추가를 눌러 항목을 등록하세요.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}


