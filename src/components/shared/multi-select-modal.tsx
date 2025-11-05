'use client'

import { useState, useEffect } from 'react'
import { X, Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SelectItem {
  id: string
  label: string
  sublabel?: string
}

interface MultiSelectModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  placeholder?: string
  selectedValues: string[]
  onConfirm: (values: string[]) => void
  fetchItems: () => Promise<SelectItem[]>
  emptyMessage?: string
}

export function MultiSelectModal({
  isOpen,
  onClose,
  title,
  placeholder = '검색...',
  selectedValues,
  onConfirm,
  fetchItems,
  emptyMessage = '항목이 없습니다.',
}: MultiSelectModalProps) {
  const [items, setItems] = useState<SelectItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [tempSelected, setTempSelected] = useState<string[]>(selectedValues)

  // 아이템 로드
  useEffect(() => {
    if (!isOpen) return

    const loadItems = async () => {
      setLoading(true)
      try {
        const data = await fetchItems()
        setItems(data)
      } catch (error) {
        console.error('아이템 로드 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    loadItems()
    setTempSelected(selectedValues)
  }, [isOpen, fetchItems, selectedValues])

  // 검색 필터
  const filteredItems = items.filter((item) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      item.label.toLowerCase().includes(searchLower) ||
      (item.sublabel && item.sublabel.toLowerCase().includes(searchLower))
    )
  })

  // 선택 토글
  const toggleItem = (label: string) => {
    setTempSelected((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    )
  }

  // 전체 선택
  const selectAll = () => {
    setTempSelected(filteredItems.map((item) => item.label))
  }

  // 전체 해제
  const clearAll = () => {
    setTempSelected([])
  }

  // 확인
  const handleConfirm = () => {
    onConfirm(tempSelected)
    onClose()
  }

  // 취소
  const handleCancel = () => {
    setTempSelected(selectedValues)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* 검색 */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-gray-600">
              선택됨: {tempSelected.length}개
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                전체 선택
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-sm text-gray-600 hover:text-gray-700 font-medium"
              >
                전체 해제
              </button>
            </div>
          </div>
        </div>

        {/* 아이템 리스트 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? '검색 결과가 없습니다.' : emptyMessage}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, index) => {
                const isSelected = tempSelected.includes(item.label)
                // 고유한 key 생성 (ID + label 조합 또는 index 사용)
                const uniqueKey = `${item.id}-${item.label}-${index}`
                return (
                  <button
                    key={uniqueKey}
                    type="button"
                    onClick={() => toggleItem(item.label)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 hover:bg-blue-100'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {item.label}
                        </div>
                        {item.sublabel && (
                          <div className="text-sm text-gray-500 mt-0.5">
                            {item.sublabel}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-blue-600 flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700"
          >
            확인 ({tempSelected.length}개 선택)
          </Button>
        </div>
      </div>
    </div>
  )
}

