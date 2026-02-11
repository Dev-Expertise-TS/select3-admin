'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RatePlanCodesEditorProps {
  value: string[]
  onChange: (codes: string[]) => void
  disabled?: boolean
}

export function RatePlanCodesEditor({ value, onChange, disabled }: RatePlanCodesEditorProps) {
  const [allCodes, setAllCodes] = useState<string[]>([])
  const [selectedCodes, setSelectedCodes] = useState<string[]>(value)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // value prop 변경 시 selectedCodes 동기화
  useEffect(() => {
    setSelectedCodes(value)
  }, [value])

  // 팝업이 열릴 때마다 현재 value로 selectedCodes 초기화 및 스크롤 조정
  useEffect(() => {
    if (isOpen) {
      setSelectedCodes(value)
      
      // 팝업이 열릴 때 스크롤 조정하여 팝업이 화면 중앙에 보이도록
      setTimeout(() => {
        if (popupRef.current && wrapperRef.current) {
          const popupRect = popupRef.current.getBoundingClientRect()
          const viewportHeight = window.innerHeight
          const popupHeight = popupRect.height
          const popupTop = popupRect.top
          
          // 팝업이 화면 중앙에 오도록 스크롤 조정
          const targetScrollY = window.scrollY + popupTop - (viewportHeight / 2) + (popupHeight / 2)
          
          // 부드러운 스크롤
          window.scrollTo({
            top: Math.max(0, targetScrollY),
            behavior: 'smooth'
          })
        }
      }, 10)
    }
  }, [isOpen, value])

  // Rate Plan Codes 로드
  useEffect(() => {
    const fetchRatePlanCodes = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/rate-plan-codes')
        const data = await response.json()
        
        if (data.success && Array.isArray(data.data)) {
          setAllCodes(data.data)
        }
      } catch (error) {
        console.error('[RatePlanCodesEditor] Failed to fetch rate plan codes:', error)
      }
      setLoading(false)
    }

    fetchRatePlanCodes()
  }, [])

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleCode = (code: string) => {
    setSelectedCodes(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code)
      } else {
        return [...prev, code]
      }
    })
  }

  const handleApply = () => {
    onChange(selectedCodes)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setSelectedCodes(value) // 원래 값으로 복원
    setIsOpen(false)
  }

  const displayValue = value.length > 0 ? value.join(', ') : 'Rate Plan Codes 선택'

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-left focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <span className={value.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
          {displayValue}
        </span>
      </button>

      {isOpen && !disabled && (
        <>
          {/* 배경 오버레이 */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          
          {/* 팝업 - 화면 중앙에 고정 */}
          <div 
            ref={popupRef}
            className="fixed z-20 w-96 bg-white border border-gray-200 rounded-md shadow-lg"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Rate Plan Codes 선택</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <div className="text-sm text-gray-500">로딩 중...</div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {allCodes.map((code) => {
                    const isSelected = selectedCodes.includes(code)
                    const isInOriginalDb = value.includes(code)
                    
                    return (
                      <label key={code} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCode(code)}
                          className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex flex-col items-start min-w-0">
                          <span className={cn(
                            "text-sm truncate",
                            isInOriginalDb ? "text-gray-900 font-medium" : "text-gray-500"
                          )}>
                            {code}
                          </span>
                          {isInOriginalDb && (
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                              DB
                            </span>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}

              {/* 선택된 코드 개수 표시 */}
              <div className="mt-4 p-2 bg-blue-50 rounded text-sm text-blue-800">
                선택됨: {selectedCodes.length}개
              </div>

              {/* 버튼 영역 */}
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApply}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  적용하기
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
