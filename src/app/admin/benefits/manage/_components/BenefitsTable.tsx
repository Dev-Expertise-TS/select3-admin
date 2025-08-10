"use client"

import React, { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import DateInput from '@/components/shared/date-input'
import { CreateSubmitButton } from '@/components/shared/form-actions'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { highlightRowFields } from '@/components/shared/field-highlight'
import { Button } from '@/components/ui/button'

type Row = Record<string, unknown>

export interface BenefitsTableProps {
  rows: Row[]
  columns: string[]
  pkField: string
  createAction: (formData: FormData) => Promise<void>
}

export function BenefitsTable({ rows, columns, pkField, createAction }: BenefitsTableProps) {
  const [adding, setAdding] = useState(false)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async (params: { pkField: string; pkValue: string }) => {
      const res = await fetch('/api/benefits/manage/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) })
      if (!res.ok) throw new Error('delete failed')
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['benefits-list'] })
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/benefits/manage/save', { method: 'POST', body: formData })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.success === false) throw new Error(json.error || 'save failed')
      return { formData }
    },
    onSuccess: async ({ formData }) => {
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
        <thead className="hidden">
          <tr><th></th></tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {adding && (
            <tr className="bg-blue-50/40 hover:bg-orange-100 transition-colors">
              <td colSpan={columns.length + 1} className="px-4 py-3">
                <form id="new-row-form" action={createAction}>
                  {/* 모든 필드를 한 줄에 고정 간격으로 배치 */}
                  <div className="flex items-center gap-4">
                    {/* 기타 필드 (benefit, description 등) */}
                    {otherFields.map((c) => {
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
                      <CreateSubmitButton formId="new-row-form" />
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() => setAdding(false)}
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
                      await saveMutation.mutateAsync(fd)
                    }}
                  >
                    <input type="hidden" name="pkField" value={pkField} />
                    <input type="hidden" name="pkValue" value={String(r[pkField])} />
                    {/* 모든 필드를 한 줄에 고정 간격으로 배치 */}
                    <div className="flex items-center gap-4">
                      {/* 기타 필드 (benefit, description 등) */}
                      {otherFields.map((c) => {
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
                          disabled={saveMutation.isPending}
                        >
                          {saveMutation.isPending ? '저장 중...' : '저장'}
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="destructive"
                          onClick={async () => {
                            const pkValue = String(r[pkField])
                            await deleteMutation.mutateAsync({ pkField, pkValue })
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


