"use client"

import React, { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import DateInput from '@/components/shared/date-input'
import { CreateSubmitButton } from '@/components/shared/form-actions'
import { useMutation, useQueryClient } from '@tanstack/react-query'

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
    mutationFn: async (payload: { pkField: string; pkValue: string }) => {
      const res = await fetch('/api/benefits/manage/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('delete failed')
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['benefits-list'] })
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: FormData) => {
      const res = await fetch('/api/benefits/manage/save', { method: 'POST', body: payload })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.success === false) throw new Error(json.error || 'save failed')
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['benefits-list'] })
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
            <tr className="bg-blue-50/40">
              <td colSpan={columns.length + 1} className="px-4 py-3">
                <form id="new-row-form" action={createAction} className="space-y-3">
                  {/* 1행: 기타 필드 */}
                  {otherFields.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {otherFields.map((c) => (
                        <div key={`new-${c}`} className="flex items-center gap-2">
                          <label className="w-28 shrink-0 text-xs text-gray-600">{c}</label>
                          <input name={c} placeholder={c} className="w-full rounded border px-2 py-1 text-sm" />
                        </div>
                      ))}
                    </div>
                  )}
                  {/* 2행: 날짜 필드 + 버튼을 같은 행의 그리드 셀에 배치 */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {dateFields.map((c) => (
                      <div key={`new-${c}`} className="flex items-center gap-2">
                        <label className="w-28 shrink-0 text-xs text-gray-600">{c}</label>
                        <DateInput name={c} />
                      </div>
                    ))}
                    <div className="flex items-center justify-end gap-2">
                      <CreateSubmitButton formId="new-row-form" />
                      <button
                        type="button"
                        onClick={() => setAdding(false)}
                        className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
                      >
                        취소
                      </button>
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
                className={`${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 transition-colors`}
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
                    {/* 1행: 기타 필드 */}
                    {otherFields.length > 0 && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {otherFields.map((c) => (
                          <div key={`${String(r[pkField])}-${c}`} className="flex items-center gap-2">
                            <label className="w-28 shrink-0 text-xs text-gray-600">{c}</label>
                            <input name={c} defaultValue={String(r[c] ?? '')} className="w-full rounded border px-2 py-1 text-sm" />
                          </div>
                        ))}
                      </div>
                    )}
                    {/* 2행: 날짜 필드 + 같은 행의 마지막 셀에 버튼 배치 */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {dateFields.map((c) => (
                        <div key={`${String(r[pkField])}-${c}`} className="flex items-center gap-2">
                          <label className="w-28 shrink-0 text-xs text-gray-600">{c}</label>
                          <DateInput name={c} defaultValue={toDateInputValue(r[c])} />
                        </div>
                      ))}
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="submit"
                          className="rounded bg-gray-100 px-3 py-1.5 text-sm"
                          disabled={saveMutation.isPending}
                        >
                          {saveMutation.isPending ? '저장 중...' : '저장'}
                        </button>
                        <button
                          type="button"
                          className="rounded bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
                          onClick={async () => {
                            const pkValue = String(r[pkField])
                            await deleteMutation.mutateAsync({ pkField, pkValue })
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? '삭제 중...' : '삭제'}
                        </button>
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


