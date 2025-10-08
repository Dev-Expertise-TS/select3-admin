'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Search } from 'lucide-react'

interface Hotel {
  sabre_id: string
  property_name_ko: string | null
  property_name_en: string | null
  property_address: string | null
}

interface HotelSearchSelectorProps {
  selectedHotels: Set<string>
  onSelectionChange: (selectedHotels: Set<string>) => void
  multiple?: boolean
}

export function HotelSearchSelector({ selectedHotels, onSelectionChange, multiple = true }: HotelSearchSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Hotel[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // 검색어 변경 시 자동 검색 (디바운스)
  useEffect(() => {
    const searchHotels = async () => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setSearchResults([])
        return
      }

      setSearchLoading(true)
      try {
        console.log('[HotelSearchSelector] 검색 시작:', searchQuery)
        const response = await fetch(`/api/hotel/search?q=${encodeURIComponent(searchQuery.trim())}`)
        const data = await response.json()
        
        console.log('[HotelSearchSelector] 검색 결과:', data)
        
        if (data.success && Array.isArray(data.data)) {
          setSearchResults(data.data)
          console.log('[HotelSearchSelector] 검색된 호텔 수:', data.data.length)
        } else {
          setSearchResults([])
          console.log('[HotelSearchSelector] 검색 실패:', data.error)
        }
      } catch (error) {
        console.error('[HotelSearchSelector] 검색 오류:', error)
        setSearchResults([])
      }
      setSearchLoading(false)
    }

    const timeoutId = setTimeout(searchHotels, 300) // 300ms 디바운스
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const toggleSelection = (sabreId: string) => {
    const newSet = new Set(selectedHotels)
    if (multiple) {
      if (newSet.has(sabreId)) {
        newSet.delete(sabreId)
      } else {
        newSet.add(sabreId)
      }
    } else {
      if (newSet.has(sabreId)) {
        newSet.clear()
      } else {
        newSet.clear()
        newSet.add(sabreId)
      }
    }
    onSelectionChange(newSet)
  }

  return (
    <div className="space-y-0">
      {/* 검색 영역 */}
      <div className="p-6 border-b bg-gray-50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
          {searchLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600 animate-spin z-10" />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sabre ID, 호텔명 (한글/영문) 검색... (최소 2자)"
            className="w-full pl-10 pr-10 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        {selectedHotels.size > 0 && (
          <div className="mt-3 px-3 py-2 bg-blue-50 rounded-md">
            <span className="text-sm text-blue-700 font-medium">
              ✓ {selectedHotels.size}개 호텔 선택됨
            </span>
          </div>
        )}
        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <div className="mt-2 text-xs text-gray-500">
            최소 2자 이상 입력해주세요.
          </div>
        )}
      </div>

      {/* 검색 결과 */}
      <div className="px-6 pb-6 pt-4 overflow-y-auto max-h-[calc(85vh-340px)]">
        {searchLoading && searchResults.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">검색 중...</span>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchQuery.trim().length >= 2 ? '검색 결과가 없습니다.' : '호텔명 또는 Sabre ID를 입력하세요.'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              최소 2자 이상 입력하면 자동으로 검색됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {searchResults.map((hotel) => (
              <div
                key={hotel.sabre_id}
                onClick={() => toggleSelection(hotel.sabre_id)}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedHotels.has(hotel.sabre_id)
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type={multiple ? 'checkbox' : 'radio'}
                    checked={selectedHotels.has(hotel.sabre_id)}
                    onChange={() => {}}
                    className="mt-1 w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {hotel.sabre_id}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">
                      {hotel.property_name_ko || hotel.property_name_en || '이름 없음'}
                    </h3>
                    {hotel.property_name_en && hotel.property_name_ko && (
                      <p className="text-sm text-gray-600 mt-1 truncate">{hotel.property_name_en}</p>
                    )}
                    {hotel.property_address && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{hotel.property_address}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 결과 개수 표시 */}
      {searchResults.length > 0 && !searchLoading && (
        <div className="px-6 pb-2 text-sm text-gray-600">
          검색 결과: {searchResults.length}개
        </div>
      )}
    </div>
  )
}

