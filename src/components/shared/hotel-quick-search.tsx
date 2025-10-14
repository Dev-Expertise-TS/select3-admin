'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
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
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

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

  // initialQuery 변경 시 입력값 동기화 (외부 값 반영)
  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  // 포지셔닝(포탈 렌더용) 계산
  useLayoutEffect(() => {
    if (!open) return
    const el = wrapperRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 10000,
    })

    const onReposition = () => {
      const r = el.getBoundingClientRect()
      setDropdownStyle({ position: 'fixed', top: r.bottom + 4, left: r.left, width: r.width, zIndex: 10000 })
    }
    window.addEventListener('scroll', onReposition, true)
    window.addEventListener('resize', onReposition)
    return () => {
      window.removeEventListener('scroll', onReposition, true)
      window.removeEventListener('resize', onReposition)
    }
  }, [open])

  return (
    <div ref={wrapperRef} className="relative">
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
      {open && results.length > 0 && typeof window !== 'undefined' &&
        // 포탈을 사용하여 최상위로 렌더 → 어떤 영역에도 가려지지 않음
        (ReactDOM.createPortal(
          <div style={dropdownStyle} className="max-h-64 overflow-auto rounded-md border border-gray-200 bg-white shadow-2xl">
            {results.map((h) => (
              <button
                key={`${h.sabre_id}-${h.property_name_ko ?? ''}-${h.property_name_en ?? ''}`}
                type="button"
                className="w-full px-4 py-2 text-left hover:bg-gray-50"
                onClick={() => {
                  onSelect(h)
                  const label = `${h.property_name_ko ?? ''} (Sabre ID: ${h.sabre_id})`.trim()
                  setQuery(label)
                  setOpen(false)
                }}
              >
                <div className="font-medium text-gray-900">{h.property_name_ko || '-'}</div>
                <div className="text-xs text-gray-400 font-mono">Sabre ID: {h.sabre_id}</div>
              </button>
            ))}
          </div>,
          document.body
        ))}
    </div>
  )
}


