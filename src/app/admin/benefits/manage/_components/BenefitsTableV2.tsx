"use client"

import React, { useMemo, useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { saveBenefit, deleteBenefit } from '@/features/benefits/actions'

type Row = Record<string, unknown>

export function BenefitsTableV2() {
  const [adding, setAdding] = useState(false)
  const [savingRecords, setSavingRecords] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  // 혜택 목록 조회
  const { data: benefitsData, isLoading, error } = useQuery({
    queryKey: ['benefits-list'],
    queryFn: async () => {
      const response = await fetch('/api/benefits/list')
      if (!response.ok) throw new Error('Failed to fetch benefits')
      const result = await response.json()
      return result.data || []
    },
  })

  const rows: Row[] = benefitsData || []
  
  const originalColumns = useMemo(() => {
    return rows[0] ? Object.keys(rows[0]) : ['benefit_id', 'name_kr', 'name_en', 'description_kr', 'description_en']
  }, [rows])
  
  const pkCandidates = ['benefit_id', 'id', 'uuid']
  const pkField = pkCandidates.find((k) => originalColumns.includes(k)) || 'benefit_id'
  
  const excludeSet = new Set<string>(['created_at', 'updated_at'])
  const displayColumns = originalColumns.filter((c) => !excludeSet.has(c))
  
  const columns = useMemo(() => {
    return displayColumns.includes('benefit_id') 
      ? ['benefit_id', ...displayColumns.filter(c => c !== 'benefit_id')]
      : displayColumns
  }, [displayColumns])

  // 삭제 핸들러
  const handleDelete = async (pkValue: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    startTransition(async () => {
      const result = await deleteBenefit(Number(pkValue))
      
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ['benefits-list'] })
        alert('삭제되었습니다.')
      } else {
        alert(result.error || '삭제에 실패했습니다.')
      }
    })
  }

  // 저장 핸들러
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const pkValue = String(formData.get(pkField) || formData.get('benefit_id') || 'new')
    
    setSavingRecords(prev => new Set(prev).add(pkValue))
    
    startTransition(async () => {
      const result = await saveBenefit(formData)
      
      setSavingRecords(prev => {
        const newSet = new Set(prev)
        newSet.delete(pkValue)
        return newSet
      })
      
      if (result.success) {
        alert('저장되었습니다.')
        await queryClient.invalidateQueries({ queryKey: ['benefits-list'] })
        setAdding(false)
      } else {
        alert(result.error || '저장에 실패했습니다.')
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">오류: {error instanceof Error ? error.message : '데이터 로드 실패'}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 새 항목 추가 버튼 */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">혜택 관리</h2>
        {!adding && (
          <Button onClick={() => setAdding(true)}>
            + 새 혜택 추가
          </Button>
        )}
      </div>

      {/* 데이터 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* 새 항목 추가 행 */}
            {adding && (
              <tr className="bg-blue-50">
                <td colSpan={columns.length + 1} className="px-6 py-4">
                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          혜택명 (한글) *
                        </label>
                        <input
                          type="text"
                          name="name_kr"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="예: 조식 무료"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          혜택명 (영문)
                        </label>
                        <input
                          type="text"
                          name="name_en"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="예: Free Breakfast"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          설명 (한글)
                        </label>
                        <textarea
                          name="description_kr"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="혜택 설명"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          설명 (영문)
                        </label>
                        <textarea
                          name="description_en"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Benefit description"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={isPending}>
                        {isPending ? '저장 중...' : '저장'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAdding(false)}
                        disabled={isPending}
                      >
                        취소
                      </Button>
                    </div>
                  </form>
                </td>
              </tr>
            )}

            {/* 기존 데이터 행 */}
            {rows.map((row, idx) => {
              const pk = String(row[pkField])
              const isSaving = savingRecords.has(pk)

              return (
                <tr key={pk || idx} className={cn(isSaving && 'bg-yellow-50')}>
                  {columns.map((col) => (
                    <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <form onSubmit={handleSave}>
                        <input type="hidden" name={pkField} value={pk} />
                        <input
                          type="text"
                          name={col}
                          defaultValue={String(row[col] || '')}
                          className="w-full px-2 py-1 border border-gray-200 rounded focus:border-blue-500 focus:outline-none"
                          disabled={isSaving}
                        />
                      </form>
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(pk)}
                        disabled={isPending}
                      >
                        삭제
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && !adding && (
        <div className="text-center py-8 text-gray-500">
          등록된 혜택이 없습니다.
        </div>
      )}
    </div>
  )
}

