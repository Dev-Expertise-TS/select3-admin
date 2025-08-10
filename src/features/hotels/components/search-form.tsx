"use client"

import React, { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'

interface SearchFormProps {
  initialQ: string
}

export function SearchForm({ initialQ }: SearchFormProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [q, setQ] = useState(initialQ)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [openSuggest, setOpenSuggest] = useState(false)
  const [loadingSuggest, setLoadingSuggest] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const [highlightIndex, setHighlightIndex] = useState<number>(-1)
  const listRef = useRef<HTMLUListElement | null>(null)

  const suggestEnabled = q.trim().length > 0
  const { data: suggestData, isFetching: isFetchingSuggest } = useQuery({
    queryKey: ['suggest', q],
    queryFn: async () => {
      const controller = new AbortController()
      abortRef.current?.abort()
      abortRef.current = controller
      const url = `/api/hotel/suggest?field=all&q=${encodeURIComponent(q)}&limit=8`
      const res = await fetch(url, { signal: controller.signal })
      const json = await res.json()
      if (json.success) return (json.data as string[]) || []
      return []
    },
    enabled: suggestEnabled,
    staleTime: 60_000,
  })

  useEffect(() => {
    setLoadingSuggest(isFetchingSuggest)
    if (!suggestEnabled) {
      setSuggestions([])
      setOpenSuggest(false)
      return
    }
    const list = suggestData ?? []
    setSuggestions(list)
    setOpenSuggest(list.length > 0)
  }, [suggestEnabled, suggestData, isFetchingSuggest])

  useEffect(() => {
    if (!openSuggest || highlightIndex < 0) return
    const el = listRef.current?.querySelector(`li[data-index="${highlightIndex}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [openSuggest, highlightIndex])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (q) params.set('q', q)
    else params.delete('q')
    params.delete('sabreId'); params.delete('nameKor'); params.delete('nameEng')
    params.set('page', '1')
    setOpenSuggest(false)
    setSuggestions([])
    router.push(`${pathname}?${params.toString()}`)
  }

  const onSelectSuggestion = (value: string) => {
    setQ(value)
    setOpenSuggest(false)
  }

  const performSubmit = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value) params.set('q', value)
    else params.delete('q')
    params.delete('sabreId'); params.delete('nameKor'); params.delete('nameEng')
    params.set('page', '1')
    setOpenSuggest(false)
    setSuggestions([])
    router.push(`${pathname}?${params.toString()}`)
  }

  const onKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!openSuggest && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpenSuggest(true)
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((prev) => {
        const next = prev + 1
        return next >= suggestions.length ? 0 : next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((prev) => {
        if (prev === -1) return Math.max(0, suggestions.length - 1)
        const next = prev - 1
        return next < 0 ? Math.max(0, suggestions.length - 1) : next
      })
    } else if (e.key === 'Enter') {
      if (openSuggest && suggestions.length > 0 && highlightIndex !== -1) {
        e.preventDefault()
        const chosen = suggestions[highlightIndex]
        setQ(chosen)
        setOpenSuggest(false)
        setHighlightIndex(-1)
        performSubmit(chosen)
      }
    } else if (e.key === 'Escape') {
      setOpenSuggest(false)
      setHighlightIndex(-1)
    }
  }

  const onReset = () => {
    setQ('')
    setSuggestions([])
    setOpenSuggest(false)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.delete('q'); params.delete('sabreId'); params.delete('nameKor'); params.delete('nameEng'); params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-lg border bg-white p-4">
      <label htmlFor="hotel-update-search" className="mb-2 block text-sm font-medium text-gray-700">호텔 검색</label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            id="hotel-update-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="호텔명을 입력하세요 (한글/영문/Sabre ID)"
            autoComplete="off"
            onKeyDown={onKeyDown}
            className="focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-describedby="hotel-update-search-desc"
          />
          {openSuggest && suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow">
              <ul ref={listRef} className="divide-y" role="listbox">
                {suggestions.map((s, idx) => (
                  <li key={s} data-index={idx} id={`upd-suggest-${idx}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={idx === highlightIndex}
                      className={cn(
                        'block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-50',
                        idx === highlightIndex ? 'bg-gray-100' : ''
                      )}
                      onClick={() => onSelectSuggestion(s)}
                    >
                      {s}
                    </button>
                  </li>
                ))}
                {loadingSuggest && suggestions.length === 0 && (
                  <li className="px-3 py-2 text-xs text-gray-500">불러오는 중...</li>
                )}
              </ul>
            </div>
          )}
        </div>
        <Button type="submit">검색</Button>
        <Button type="button" variant="secondary" onClick={onReset}>초기화</Button>
      </div>
      <p id="hotel-update-search-desc" className="text-xs text-gray-500 mt-1">한글명, 영문명, Sabre ID 로 검색할 수 있습니다</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm">Sabre ID 체크</Button>
        <Button type="button" variant="outline" size="sm">Benefits 체크</Button>
        <Button type="button" variant="outline" size="sm">호텔 체인 체크</Button>
      </div>
    </form>
  )
}


