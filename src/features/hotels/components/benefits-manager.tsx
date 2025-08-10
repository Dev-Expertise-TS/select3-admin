'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'

export type BenefitRow = {
  benefit_id: string | number
  benefit: string | null
  benefit_description: string | null
  start_date: string | null
  end_date: string | null
}

interface Props {
  initial: BenefitRow[]
}

export function BenefitsManager({ initial }: Props) {
  const [selected, setSelected] = React.useState<BenefitRow[]>(initial)
  const [open, setOpen] = React.useState(false)
  const [allRows, setAllRows] = React.useState<BenefitRow[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [popupSelectedIds, setPopupSelectedIds] = React.useState<Set<string>>(new Set())
  const [baselineOrder, setBaselineOrder] = React.useState<string[]>(() => initial.map((r) => String(r.benefit_id)))
  const [highlightIds, setHighlightIds] = React.useState<Set<string>>(new Set())
  const highlightTimerRef = React.useRef<number | null>(null)
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const [dropHighlightIds, setDropHighlightIds] = React.useState<Set<string>>(new Set())
  const dropTimerRef = React.useRef<number | null>(null)

  const selectedIdSet = React.useMemo(() => new Set(selected.map((r) => String(r.benefit_id))), [selected])
  const available = React.useMemo(() => allRows.filter((r) => !selectedIdSet.has(String(r.benefit_id))), [allRows, selectedIdSet])
  const isDirty = React.useMemo(() => {
    const currentOrder = selected.map((r) => String(r.benefit_id))
    if (currentOrder.length !== baselineOrder.length) return true
    for (let i = 0; i < currentOrder.length; i++) {
      if (currentOrder[i] !== baselineOrder[i]) return true
    }
    return false
  }, [selected, baselineOrder])

  React.useEffect(() => {
    setBaselineOrder(initial.map((r) => String(r.benefit_id)))
  }, [initial])

  React.useEffect(() => {
    const handler = () => {
      const currentOrder = selected.map((r) => String(r.benefit_id))
      const changed: string[] = []
      const oldIndex = new Map(baselineOrder.map((id, idx) => [id, idx]))
      const curIndex = new Map(currentOrder.map((id, idx) => [id, idx]))
      currentOrder.forEach((id) => { if (!oldIndex.has(id)) changed.push(id) })
      currentOrder.forEach((id) => {
        const oi = oldIndex.get(id)
        const ci = curIndex.get(id)
        if (oi != null && ci != null && oi !== ci) changed.push(id)
      })
      setHighlightIds(new Set(changed))
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightIds(new Set())
        highlightTimerRef.current = null
      }, 1500)
      setBaselineOrder(currentOrder)
    }
    window.addEventListener('benefits:commit', handler)
    return () => window.removeEventListener('benefits:commit', handler)
  }, [selected, baselineOrder])

  const { data: popupData, isFetching: popupFetching, refetch: refetchPopup } = useQuery({
    queryKey: ['benefits-list'],
    queryFn: async () => {
      const res = await fetch('/api/benefits/list', { cache: 'no-store' })
      const json = await res.json()
      if (json.success) {
        const rows = (json.data as Array<{ benefit_id: string | number; benefit: string | null; benefit_description: string | null; start_date: string | null; end_date: string | null }>).
          map((r) => ({
            benefit_id: r.benefit_id,
            benefit: r.benefit ?? null,
            benefit_description: r.benefit_description ?? null,
            start_date: r.start_date ?? null,
            end_date: r.end_date ?? null,
          })) as BenefitRow[]
        return rows
      }
      throw new Error(json.error || 'fetch failed')
    },
    enabled: false,
    staleTime: 60_000,
  })

  const openPopup = async () => {
    setOpen(true)
    setPopupSelectedIds(new Set())
    setError(null)
    try {
      const d = popupData ?? (await refetchPopup()).data
      setAllRows(d ?? [])
    } catch {
      setError('네트워크 오류')
    }
  }

  const togglePopupSelect = (id: string | number) => {
    const key = String(id)
    setPopupSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const addSelectedFromPopup = () => {
    if (popupSelectedIds.size === 0) {
      setOpen(false)
      return
    }
    const toAdd = available.filter((r) => popupSelectedIds.has(String(r.benefit_id)))
    if (toAdd.length > 0) setSelected((prev) => [...prev, ...toAdd])
    setOpen(false)
  }

  const removeById = (id: string | number) => setSelected((prev) => prev.filter((r) => String(r.benefit_id) !== String(id)))

  const onDragStart = (e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(id)
  }
  const onDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const onDrop = (e: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId) return
    const sourceIdx = selected.findIndex((r) => String(r.benefit_id) === sourceId)
    const targetIdx = selected.findIndex((r) => String(r.benefit_id) === targetId)
    if (sourceIdx < 0 || targetIdx < 0) return
    setSelected((prev) => {
      const next = [...prev]
      const [moved] = next.splice(sourceIdx, 1)
      next.splice(targetIdx, 0, moved)
      return next
    })
    setDraggingId(null)
    setDropHighlightIds(new Set([sourceId]))
    if (dropTimerRef.current) window.clearTimeout(dropTimerRef.current)
    dropTimerRef.current = window.setTimeout(() => {
      setDropHighlightIds(new Set())
      dropTimerRef.current = null
    }, 800)
  }
  const onDragEnd = () => setDraggingId(null)

  return (
    <div className="overflow-x-auto rounded border">
      {isDirty && (
        <input type="hidden" name="__benefits_dirty" value="1" data-initial="0" />
      )}
      {selected.map((r, idx) => (
        <React.Fragment key={`hidden-${r.benefit_id}`}>
          <input type="hidden" name="mapped_benefit_id" value={String(r.benefit_id)} />
          <input type="hidden" name={`mapped_sort__${String(r.benefit_id)}`} value={String(idx)} />
        </React.Fragment>
      ))}

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Benefit</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Description</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Start Date</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">End Date</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {selected.map((r) => {
            const id = String(r.benefit_id)
            const isHighlighted = highlightIds.has(id)
            const isDropHighlighted = dropHighlightIds.has(id)
            return (
              <tr
                key={r.benefit_id}
                data-benefit-id={id}
                className={[
                  isHighlighted
                    ? 'bg-yellow-50 transition-colors duration-500'
                    : isDropHighlighted
                    ? 'bg-blue-100 transition-colors duration-300'
                    : draggingId === id
                    ? 'bg-pink-100'
                    : '',
                  'select-none',
                  draggingId === id ? 'cursor-grabbing' : 'hover:cursor-grab',
                ].join(' ')}
                draggable
                onDragStart={(e) => onDragStart(e, id)}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, id)}
                onDragEnd={onDragEnd}
              >
                <td className="px-4 py-2 text-sm text-gray-900">{r.benefit ?? ''}</td>
                <td className="px-4 py-2 text-xs text-gray-700">{r.benefit_description ?? ''}</td>
                <td className="px-4 py-2 text-xs text-gray-700">{r.start_date ?? ''}</td>
                <td className="px-4 py-2 text-xs text-gray-700">{r.end_date ?? ''}</td>
                <td className="px-4 py-2 text-right">
                  <Button type="button" variant="destructive" size="xs" onClick={() => removeById(r.benefit_id)}>
                    삭제
                  </Button>
                </td>
              </tr>
            )
          })}
          {selected.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">연결된 Benefits 가 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex justify-end px-4 py-2">
        <Button type="button" size="sm" onClick={openPopup}>Benefit 추가</Button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[min(95vw,900px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Benefit 선택</div>
              <Button type="button" variant="secondary" size="xs" onClick={() => setOpen(false)}>닫기</Button>
            </div>
            {popupFetching ? (
              <div className="p-4 text-sm text-gray-600">불러오는 중...</div>
            ) : error ? (
              <div className="p-4 text-sm text-red-700 bg-red-50 border">{error}</div>
            ) : (
              <div className="flex flex-col">
                <div className="max-h-[60vh] overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">ID</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Benefit</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Description</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Start</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">End</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">선택</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {available.map((r) => {
                        const isPicked = popupSelectedIds.has(String(r.benefit_id))
                        return (
                          <tr key={r.benefit_id} className={isPicked ? 'bg-blue-50' : 'hover:bg-blue-50'}>
                            <td className="px-3 py-2 text-xs text-gray-700">{String(r.benefit_id)}</td>
                            <td className="px-3 py-2 text-sm">{r.benefit ?? ''}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{r.benefit_description ?? ''}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{r.start_date ?? ''}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{r.end_date ?? ''}</td>
                            <td className="px-3 py-2 text-right">
                              <Button type="button" size="xs" variant={isPicked ? 'secondary' : 'default'} onClick={() => togglePopupSelect(r.benefit_id)}>
                                {isPicked ? '선택됨' : '선택'}
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                      {available.length === 0 && (
                        <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-gray-500">추가 가능한 항목이 없습니다.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>취소</Button>
                  <Button type="button" size="sm" disabled={popupSelectedIds.size === 0} onClick={addSelectedFromPopup}>추가</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}



