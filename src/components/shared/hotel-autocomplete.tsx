'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Hotel {
  sabre_id: string
  property_name_ko: string
  property_name_en: string
}

interface HotelAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function HotelAutocomplete({ 
  value, 
  onChange, 
  placeholder = "호텔명 또는 Sabre ID 입력",
  className 
}: HotelAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState(String(value || ''))
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // value prop이 변경될 때 searchTerm 업데이트
  useEffect(() => {
    setSearchTerm(String(value || ''))
  }, [value])

  // 검색어 변경 시 호텔 검색 (입력 기반)
  useEffect(() => {
    const searchHotels = async () => {
      if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length < 2) {
        setHotels([])
        setIsOpen(false)
        return
      }

      setLoading(true)
      try {
        console.log('호텔 검색 시작:', searchTerm)
        const response = await fetch(`/api/hotel/search?q=${encodeURIComponent(searchTerm)}`)
        const result = await response.json()
        
        console.log('호텔 검색 응답:', result)
        
        if (result.success) {
          setHotels(result.data || [])
          setIsOpen(true)
          setSelectedIndex(-1)
          console.log('검색된 호텔 수:', result.data?.length || 0)
        } else {
          setHotels([])
          setIsOpen(false)
          console.log('호텔 검색 실패:', result.error)
        }
      } catch (error) {
        console.error('호텔 검색 오류:', error)
        setHotels([])
        setIsOpen(false)
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(searchHotels, 300) // 300ms 디바운스
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node) &&
          listRef.current && !listRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || hotels.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < hotels.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < hotels.length) {
          selectHotel(hotels[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  // 호텔 선택
  const selectHotel = (hotel: Hotel) => {
    setSearchTerm(hotel.property_name_ko)
    onChange(hotel.sabre_id)
    setIsOpen(false)
    setSelectedIndex(-1)
  }

  // 입력값 변경
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = String(e.target.value || '')
    setSearchTerm(newValue)
    
    // Sabre ID 형식인지 확인 (숫자만)
    if (/^\d+$/.test(newValue)) {
      onChange(newValue)
    } else if (newValue.trim() === '') {
      onChange('')
    } else {
      // 호텔명 입력 시에는 빈 문자열로 설정 (검색 중임을 표시)
      onChange('')
    }
  }

  // 포커스 시 최근 등록 호텔 목록 로드 (검색어가 비어 있을 때만)
  const handleFocus = async () => {
    const trimmed = typeof searchTerm === 'string' ? searchTerm.trim() : ''

    // 입력값이 이미 있는 경우, 기존 검색 결과가 있다면 드롭다운만 열기
    if (trimmed.length >= 2) {
      if (hotels.length > 0) {
        setIsOpen(true)
      }
      return
    }

    // 검색어가 비어 있을 때: 최근 등록 호텔 목록 조회
    try {
      setLoading(true)
      const response = await fetch(`/api/hotel/search?q=&limit=10`)
      const result = await response.json()

      if (response.ok && result.success) {
        setHotels(result.data || [])
        setIsOpen((result.data?.length || 0) > 0)
        setSelectedIndex(-1)
      } else {
        setHotels([])
        setIsOpen(false)
      }
    } catch (error) {
      console.error('최근 호텔 목록 조회 오류:', error)
      setHotels([])
      setIsOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={className}
      />
      
      {/* 로딩 인디케이터 */}
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
        </div>
      )}

      {/* 드롭다운 리스트 */}
      {isOpen && hotels.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {hotels.map((hotel, index) => (
            <div
              key={hotel.sabre_id}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm",
                index === selectedIndex
                  ? "bg-blue-50 text-blue-900"
                  : "hover:bg-gray-50"
              )}
              onClick={() => selectHotel(hotel)}
            >
              <div className="font-medium text-gray-900">
                {hotel.property_name_ko}
              </div>
              <div className="text-xs text-gray-500">
                {hotel.property_name_en} • Sabre ID: {hotel.sabre_id}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
