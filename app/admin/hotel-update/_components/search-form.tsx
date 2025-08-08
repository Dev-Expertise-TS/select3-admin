'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SearchFormProps {
  initial: {
    sabreId: string
    nameKor: string
    nameEng: string
  }
}

export function SearchForm({ initial }: SearchFormProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [sabreId, setSabreId] = useState(initial.sabreId)
  const [nameKor, setNameKor] = useState(initial.nameKor)
  const [nameEng, setNameEng] = useState(initial.nameEng)
  const [engSuggestions, setEngSuggestions] = useState<string[]>([])
  const [openSuggest, setOpenSuggest] = useState(false)
  const [loadingSuggest, setLoadingSuggest] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!nameEng) {
      setEngSuggestions([])
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
        const url = `/api/hotel/suggest?field=eng&q=${encodeURIComponent(nameEng)}&limit=8`
        const res = await fetch(url, { signal: controller.signal })
        const json = await res.json()
        if (json.success) {
          setEngSuggestions(json.data || [])
          setOpenSuggest(true)
        } else {
          setEngSuggestions([])
          setOpenSuggest(false)
        }
      } catch {
        // ignore
      } finally {
        setLoadingSuggest(false)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [nameEng])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    sabreId ? params.set('sabreId', sabreId) : params.delete('sabreId')
    nameKor ? params.set('nameKor', nameKor) : params.delete('nameKor')
    nameEng ? params.set('nameEng', nameEng) : params.delete('nameEng')
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  const onSelectSuggestion = (value: string) => {
    setNameEng(value)
    setOpenSuggest(false)
  }

  return (
    <form onSubmit={onSubmit} className="mb-6 grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-3">
      <div>
        <label htmlFor="sabreId" className="mb-1 block text-xs font-medium text-gray-600">Sabre ID</label>
        <input
          id="sabreId"
          type="text"
          value={sabreId}
          onChange={(e) => setSabreId(e.target.value)}
          placeholder="예: 123456"
          className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="nameKor" className="mb-1 block text-xs font-medium text-gray-600">호텔명(한글)</label>
        <input
          id="nameKor"
          type="text"
          value={nameKor}
          onChange={(e) => setNameKor(e.target.value)}
          placeholder="예: 신라호텔"
          className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="relative">
        <label htmlFor="nameEng" className="mb-1 block text-xs font-medium text-gray-600">호텔명(영문)</label>
        <input
          id="nameEng"
          type="text"
          value={nameEng}
          onChange={(e) => setNameEng(e.target.value)}
          placeholder="예: The Shilla"
          autoComplete="off"
          className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {openSuggest && engSuggestions.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow">
            <ul className="divide-y">
              {engSuggestions.map((s) => (
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
            </ul>
          </div>
        )}
      </div>
      <div className="sm:col-span-3 flex items-center gap-2">
        <button
          type="submit"
          className={cn(
            'inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
          )}
        >
          검색
        </button>
        <button
          type="button"
          onClick={() => {
            setSabreId(''); setNameKor(''); setNameEng(''); setEngSuggestions([]); setOpenSuggest(false)
            const params = new URLSearchParams(searchParams?.toString() ?? '')
            params.delete('sabreId'); params.delete('nameKor'); params.delete('nameEng'); params.set('page', '1')
            router.push(`${pathname}?${params.toString()}`)
          }}
          className="inline-flex items-center justify-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          초기화
        </button>
      </div>
    </form>
  )
}

