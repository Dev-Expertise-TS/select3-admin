'use client'

import React, { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

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

  useEffect(() => {
    if (!q) {
      setSuggestions([])
      setOpenSuggest(false)
      abortRef.current?.abort()
      return
    }
    setLoadingSuggest(true)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const t = setTimeout(async () => {
      try {
        const url = `/api/hotel/suggest?field=all&q=${encodeURIComponent(q)}&limit=8`
        const res = await fetch(url, { signal: controller.signal })
        const json = await res.json()
        if (json.success) {
          setSuggestions(json.data || [])
          setOpenSuggest(true)
        } else {
          setSuggestions([])
          setOpenSuggest(false)
        }
      } catch {
        // ignore
      } finally {
        setLoadingSuggest(false)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [q])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    q ? params.set('q', q) : params.delete('q')
    // legacy params 제거
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
          <input
            id="hotel-update-search"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="호텔명을 입력하세요 (한글/영문/Sabre ID)"
            autoComplete="off"
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-describedby="hotel-update-search-desc"
          />
          {openSuggest && suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow">
              <ul className="divide-y">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      className="block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-50"
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
        <button
          type="submit"
          className={cn('inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700')}
        >
          검색
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          초기화
        </button>
      </div>
      <p id="hotel-update-search-desc" className="text-xs text-gray-500 mt-1">한글명, 영문명, Sabre ID 로 검색할 수 있습니다</p>
    </form>
  )
}

