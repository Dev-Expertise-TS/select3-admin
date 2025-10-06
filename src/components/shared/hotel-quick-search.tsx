'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

type Hotel = {
  sabre_id: string
  property_name_ko: string | null
  property_name_en: string | null
}

type HotelQuickSearchProps = {
  placeholder?: string
  initialQuery?: string
  onSelect: (hotel: Hotel) => void
}

export default function HotelQuickSearch({ placeholder = '호텔명 또는 Sabre ID로 검색...', initialQuery = '', onSelect }: HotelQuickSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/hotel/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (res.ok && data.success) {
          setResults(data.data || [])
          setOpen(true)
        } else {
          setResults([])
          setOpen(false)
        }
      } catch {
        setResults([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-md border border-gray-200 bg-white shadow-md">
          {results.map((h) => (
            <button
              key={`${h.sabre_id}-${h.property_name_ko ?? ''}-${h.property_name_en ?? ''}`}
              type="button"
              className="w-full px-4 py-2 text-left hover:bg-gray-50"
              onClick={() => {
                onSelect(h)
                setQuery(h.property_name_ko || h.property_name_en || h.sabre_id)
                setOpen(false)
              }}
            >
              <div className="font-medium text-gray-900">{h.property_name_ko || '-'}</div>
              <div className="text-sm text-gray-500">{h.property_name_en || '-'}</div>
              <div className="text-xs text-gray-400 font-mono">Sabre ID: {h.sabre_id}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


