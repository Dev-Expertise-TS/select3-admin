'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Tag, TagCategory } from '@/types/hashtag'

interface TagMultiSelectorProps {
  categorySlug: string // 카테고리 slug (예: 'companions', 'style')
  value: string[] // 선택된 태그명들 (name_ko)
  onChange: (tags: string[]) => void
  disabled?: boolean
  placeholder?: string
}

export function TagMultiSelector({ 
  categorySlug, 
  value, 
  onChange, 
  disabled,
  placeholder = '태그 검색...'
}: TagMultiSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [category, setCategory] = useState<TagCategory | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // 카테고리와 태그 목록 로드
  useEffect(() => {
    const loadTags = async () => {
      setIsLoading(true)
      try {
        // 1. 카테고리 조회
        const categoryRes = await fetch('/api/hashtags/categories')
        if (!categoryRes.ok) throw new Error('카테고리 조회 실패')
        const categoryResult = await categoryRes.json()
        
        if (categoryResult.success && categoryResult.data) {
          const foundCategory = categoryResult.data.find(
            (cat: TagCategory) => cat.slug === categorySlug
          )
          
          if (!foundCategory) {
            console.warn(`카테고리를 찾을 수 없습니다: ${categorySlug}`)
            return
          }
          
          setCategory(foundCategory)

          // 2. 해당 카테고리의 태그 조회
          const tagsRes = await fetch(`/api/hashtags/tags?categoryId=${foundCategory.id}&isActive=true`)
          if (!tagsRes.ok) throw new Error('태그 조회 실패')
          const tagsResult = await tagsRes.json()
          
          if (tagsResult.success && tagsResult.data) {
            setTags(tagsResult.data)
          }
        }
      } catch (error) {
        console.error('태그 목록 로드 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTags()
  }, [categorySlug])

  // 필터된 태그 목록
  const filteredTags = tags.filter((tag) => {
    const tagName = tag.name_ko || tag.name_en || ''
    const searchLower = searchTerm.toLowerCase()
    return tagName.toLowerCase().includes(searchLower)
  })

  // 태그 추가
  const handleAddTag = (tag: Tag) => {
    const tagName = tag.name_ko || tag.name_en || ''
    if (!value.includes(tagName)) {
      onChange([...value, tagName])
    }
    setSearchTerm('')
    setIsOpen(false)
  }

  // 태그 제거
  const handleRemoveTag = (tagName: string) => {
    onChange(value.filter((t) => t !== tagName))
  }

  return (
    <div className="space-y-2">
      {/* 선택된 태그 목록 */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tagName) => (
            <div
              key={tagName}
              className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
            >
              <span>{tagName}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tagName)}
                  className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 검색 및 선택 */}
      {!disabled && (
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isLoading}
          />

          {/* 드롭다운 */}
          {isOpen && searchTerm && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredTags.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    검색 결과가 없습니다.
                  </div>
                ) : (
                  filteredTags.map((tag) => {
                    const tagName = tag.name_ko || tag.name_en || ''
                    const isSelected = value.includes(tagName)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        disabled={isSelected}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                          isSelected ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''
                        }`}
                      >
                        <div className="font-medium">{tag.name_ko}</div>
                        {tag.name_en && (
                          <div className="text-xs text-gray-500">{tag.name_en}</div>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 카테고리 정보 표시 */}
      {category && (
        <p className="text-xs text-gray-500">
          카테고리: {category.name_ko}
        </p>
      )}
    </div>
  )
}

