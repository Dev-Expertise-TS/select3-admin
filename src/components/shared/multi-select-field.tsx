'use client'

import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { MultiSelectModal } from './multi-select-modal'

interface SelectItem {
  id: string
  label: string
  sublabel?: string
}

interface MultiSelectFieldProps {
  label: string
  value: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  modalTitle: string
  fetchItems: () => Promise<SelectItem[]>
  disabled?: boolean
  emptyMessage?: string
}

export function MultiSelectField({
  label,
  value,
  onChange,
  placeholder = '선택하세요',
  modalTitle,
  fetchItems,
  disabled = false,
  emptyMessage,
}: MultiSelectFieldProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleRemoveItem = (item: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter((v) => v !== item))
  }

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
        
        {/* 선택된 아이템 표시 */}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {value.map((item, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                <span>{item}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveItem(item, e)}
                    className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 선택 필드 */}
        <button
          type="button"
          onClick={() => !disabled && setIsModalOpen(true)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-between"
        >
          <span className={value.length === 0 ? 'text-gray-400' : 'text-gray-700'}>
            {value.length === 0
              ? placeholder
              : `${value.length}개 선택됨`}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* 모달 */}
      <MultiSelectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        placeholder={`${label} 검색...`}
        selectedValues={value}
        onConfirm={onChange}
        fetchItems={fetchItems}
        emptyMessage={emptyMessage}
      />
    </>
  )
}

