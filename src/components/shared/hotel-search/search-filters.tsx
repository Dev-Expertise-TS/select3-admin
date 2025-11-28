import React, { useRef, useEffect, RefObject } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HotelSearchFiltersProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  onSearch: (e: React.FormEvent) => void
  onReset: () => void
  loading: boolean
  
  suggestions: string[]
  openSuggest: boolean
  setOpenSuggest: (open: boolean) => void
  onSuggestionClick: (suggestion: string) => void
  
  inputRef?: RefObject<HTMLInputElement>
  // suggestionsRef는 내부에서 처리하거나 부모에서 넘겨줄 수 있음
}

export function HotelSearchFilters({
  searchTerm,
  setSearchTerm,
  onSearch,
  onReset,
  loading,
  
  suggestions,
  openSuggest,
  setOpenSuggest,
  onSuggestionClick,
  
  inputRef
}: HotelSearchFiltersProps) {
  const suggestionsRef = useRef<HTMLUListElement>(null)

  // 외부 클릭 감지하여 추천 목록 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef?.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setOpenSuggest(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [setOpenSuggest, inputRef])

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <form onSubmit={onSearch} className="space-y-4">
        <div>
          <label htmlFor="hotel-search" className="block text-sm font-medium text-gray-700 mb-1">
            호텔 검색
          </label>
          <div className="flex gap-2 relative">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                ref={inputRef}
                type="text"
                name="hotel-search"
                id="hotel-search"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                placeholder="호텔명(국문/영문) 또는 Sabre ID 입력..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  if (!openSuggest && e.target.value.length >= 2) {
                    setOpenSuggest(true)
                  }
                }}
                onFocus={() => {
                  if (searchTerm.length >= 1 && suggestions.length > 0) {
                    setOpenSuggest(true)
                  }
                }}
                autoComplete="off"
              />
              
              {/* 자동완성 드롭다운 */}
              {openSuggest && suggestions.length > 0 && (
                <ul
                  ref={suggestionsRef}
                  className="absolute z-50 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto"
                >
                  {suggestions.map((s, i) => (
                    <li
                      key={i}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
                      onClick={() => onSuggestionClick(s)}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium text-white",
                "bg-blue-600 hover:bg-blue-700",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors duration-200"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  검색 중...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  검색
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={onReset}
              disabled={loading}
              className={cn(
                "inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium",
                "bg-gray-100 text-gray-700 hover:bg-gray-200",
                "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors duration-200"
              )}
              aria-label="검색 초기화"
            >
              초기화
            </button>
          </div>
          <p id="hotel-search-description" className="text-xs text-gray-500 mt-1">
            한글명, 영문명, Sabre ID 로 검색할 수 있습니다
          </p>
        </div>
      </form>
    </div>
  )
}

