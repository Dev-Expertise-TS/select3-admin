'use client'

import React, { useState, useEffect } from 'react'
import { Hash, Plus, Edit, Trash2, Loader2, Tag, Folder, Hotel, Sparkles, Search, X } from 'lucide-react'
import { AuthGuard } from '@/components/shared/auth-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Tag as TagType, TagCategory, HotelTagMap } from '@/types/hashtag'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getHotelTags
  , createHotelTag,
  deleteHotelTag,
  deleteAllHotelTags
} from '@/features/hashtags/actions'

export default function HashtagManagementPage() {
  return (
    <AuthGuard>
      <HashtagManager />
    </AuthGuard>
  )
}

function HashtagManager() {
  const [activeTab, setActiveTab] = useState<'categories' | 'tags' | 'hotel-tags'>('categories')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 헤더 */}
      <div className="mb-6 flex items-center gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 shadow-lg">
          <Hash className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">해시태그 관리</h1>
          <p className="text-sm text-gray-600 mt-1">태그 카테고리, 태그, 호텔 매핑을 관리합니다.</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="mb-6 bg-white rounded-lg border p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('categories')}
            className={cn(
              "flex-1 px-4 py-2 rounded-md font-medium transition-colors",
              activeTab === 'categories'
                ? "bg-purple-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Folder className="h-4 w-4 inline mr-2" />
            카테고리 관리
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={cn(
              "flex-1 px-4 py-2 rounded-md font-medium transition-colors",
              activeTab === 'tags'
                ? "bg-purple-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Tag className="h-4 w-4 inline mr-2" />
            태그 관리
          </button>
          <button
            onClick={() => setActiveTab('hotel-tags')}
            className={cn(
              "flex-1 px-4 py-2 rounded-md font-medium transition-colors",
              activeTab === 'hotel-tags'
                ? "bg-purple-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Hotel className="h-4 w-4 inline mr-2" />
            호텔 해시태그 추출
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      {activeTab === 'categories' ? <CategoryManager /> : activeTab === 'tags' ? <TagManager /> : <HotelTagsManager />}
    </div>
  )
}

// 카테고리 관리 컴포넌트
function CategoryManager() {
  const [categories, setCategories] = useState<TagCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TagCategory | null>(null)

  const loadCategories = async () => {
    setLoading(true)
    try {
      const result = await getCategories()
      if (result.success && result.data) {
        // 중복 제거 (id 기준)
        const uniqueCategories = result.data.reduce((acc: TagCategory[], current) => {
          const isDuplicate = acc.some(item => item.id === current.id)
          if (!isDuplicate) {
            acc.push(current)
          } else {
            console.warn(`[HashtagManager] Duplicate category removed: id=${current.id}`)
          }
          return acc
        }, [])
        setCategories(uniqueCategories)
      }
    } catch (err) {
      console.error('카테고리 로드 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('이 카테고리를 삭제하시겠습니까?')) return

    try {
      const result = await deleteCategory(id)
      if (result.success) {
        alert('카테고리가 삭제되었습니다.')
        loadCategories()
      } else {
        alert(result.error || '삭제 실패')
      }
    } catch (err) {
      console.error('카테고리 삭제 오류:', err)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">카테고리 목록</h2>
        <Button
          onClick={() => {
            setEditingCategory(null)
            setShowModal(true)
          }}
          className="cursor-pointer bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          새 카테고리
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tag Category ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">한글명</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">영문명</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">정렬순서</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">패싯</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">다중선택</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{category.tag_category_id || '-'}</td>
                  <td className="px-4 py-3 text-sm font-mono">{category.slug}</td>
                  <td className="px-4 py-3 text-sm font-medium">{category.name_ko}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{category.name_en}</td>
                  <td className="px-4 py-3 text-sm text-center">{category.sort_order}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      category.is_facetable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    )}>
                      {category.is_facetable ? 'Y' : 'N'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      category.multi_select ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                    )}>
                      {category.multi_select ? 'Y' : 'N'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCategory(category)
                          setShowModal(true)
                        }}
                        className="cursor-pointer"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                        className="cursor-pointer text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowModal(false)
            setEditingCategory(null)
          }}
          onSave={() => {
            loadCategories()
            setShowModal(false)
            setEditingCategory(null)
          }}
        />
      )}
    </div>
  )
}

// 태그 관리 컴포넌트
function TagManager() {
  const [tags, setTags] = useState<TagType[]>([])
  const [categories, setCategories] = useState<TagCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTag, setEditingTag] = useState<TagType | null>(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isCleaning, setIsCleaning] = useState(false)

  const loadTags = async () => {
    setLoading(true)
    try {
      const result = await getTags(filterCategory || undefined, searchTerm || undefined)
      if (result.success && result.data) {
        // 중복 제거 (id 기준)
        const uniqueTags = result.data.reduce((acc: TagType[], current) => {
          const isDuplicate = acc.some(item => item.id === current.id)
          if (!isDuplicate) {
            acc.push(current)
          } else {
            console.warn(`[HashtagManager] Duplicate tag removed: id=${current.id}`)
          }
          return acc
        }, [])
        setTags(uniqueTags)
      }
    } catch (err) {
      console.error('태그 로드 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const result = await getCategories()
      if (result.success && result.data) {
        // 중복 제거 (id 기준)
        const uniqueCategories = result.data.reduce((acc: TagCategory[], current) => {
          const isDuplicate = acc.some(item => item.id === current.id)
          if (!isDuplicate) {
            acc.push(current)
          } else {
            console.warn(`[HashtagManager/Tags] Duplicate category removed: id=${current.id}`)
          }
          return acc
        }, [])
        setCategories(uniqueCategories)
      }
    } catch (err) {
      console.error('카테고리 로드 오류:', err)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    loadTags()
  }, [filterCategory, searchTerm])

  const handleDelete = async (id: string) => {
    if (!confirm('이 태그를 삭제하시겠습니까?\n연결된 모든 호텔 매핑도 함께 삭제됩니다.')) return

    try {
      const result = await deleteTag(id)
      if (result.success) {
        alert('태그가 삭제되었습니다.')
        loadTags()
      } else {
        alert(result.error || '삭제 실패')
      }
    } catch (err) {
      console.error('태그 삭제 오류:', err)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="태그 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">모든 카테고리</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name_ko}
            </option>
          ))}
        </select>
        <Button
          onClick={async () => {
            if (!confirm('모든 태그의 slug와 카테고리를 정리하시겠습니까?\n이 작업은 시간이 걸릴 수 있습니다.')) return
            
            setIsCleaning(true)
            
            try {
              const response = await fetch('/api/hashtags/cleanup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              })
              
              const result = await response.json()
              
              if (result.success) {
                const message = [
                  '✅ 태그 정리 완료!',
                  `- 업데이트된 태그: ${result.data.updated}개`,
                  `- 전체 태그: ${result.data.total}개`,
                ]
                if (result.data.createdCategories > 0) {
                  message.push(`- 새로 생성된 카테고리: ${result.data.createdCategories}개`)
                }
                alert(message.join('\n'))
                loadTags()
              } else {
                alert(`태그 정리 실패: ${result.error}`)
              }
            } catch (err) {
              console.error('태그 정리 오류:', err)
              alert('태그 정리 중 오류가 발생했습니다.')
            } finally {
              setIsCleaning(false)
            }
          }}
          disabled={isCleaning}
          className="cursor-pointer bg-blue-600 hover:bg-blue-700"
        >
          {isCleaning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              정리 중...
            </>
          ) : (
            <>
              <Tag className="h-4 w-4 mr-2" />
              태그 데이터 정리
            </>
          )}
        </Button>
        <Button
          onClick={() => {
            setEditingTag(null)
            setShowModal(true)
          }}
          disabled={isCleaning}
          className="cursor-pointer bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          새 태그
        </Button>
      </div>

      {isCleaning && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <div className="font-medium text-blue-900">태그 데이터 정리 중...</div>
              <div className="text-sm text-blue-700">모든 태그의 slug를 영문으로 변환하고 카테고리를 재배치하고 있습니다. 잠시만 기다려주세요.</div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tag Category ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">한글명</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">영문명</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">카테고리</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">태그 설명 (한글)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">활성</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{tag.tag_category_id || '-'}</td>
                  <td className="px-4 py-3 text-sm font-mono">{tag.slug}</td>
                  <td className="px-4 py-3 text-sm font-medium">{tag.name_ko}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{tag.name_en}</td>
                  <td className="px-4 py-3 text-sm">
                    {(tag as any).category?.name_ko || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                    <div className="line-clamp-2" title={tag.description_ko || ''}>
                      {tag.description_ko || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      tag.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    )}>
                      {tag.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTag(tag)
                          setShowModal(true)
                        }}
                        disabled={isCleaning}
                        className="cursor-pointer"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(tag.id)}
                        disabled={isCleaning}
                        className="cursor-pointer text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <TagModal
          tag={editingTag}
          categories={categories}
          onClose={() => {
            setShowModal(false)
            setEditingTag(null)
          }}
          onSave={() => {
            loadTags()
            setShowModal(false)
            setEditingTag(null)
          }}
        />
      )}
    </div>
  )
}

// 카테고리 모달
interface CategoryModalProps {
  category: TagCategory | null
  onClose: () => void
  onSave: () => void
}

function CategoryModal({ category, onClose, onSave }: CategoryModalProps) {
  const [formData, setFormData] = useState({
    slug: category?.slug || '',
    name_ko: category?.name_ko || '',
    name_en: category?.name_en || '',
    tag_category_id: category?.tag_category_id || '',
    sort_order: category?.sort_order ?? 0,
    is_facetable: category?.is_facetable ?? true,
    multi_select: category?.multi_select ?? true,
    icon: category?.icon || ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const form = new FormData()
      form.append('slug', formData.slug)
      form.append('name_ko', formData.name_ko)
      form.append('name_en', formData.name_en)
      form.append('tag_category_id', formData.tag_category_id)
      form.append('sort_order', String(formData.sort_order))
      form.append('is_facetable', String(formData.is_facetable))
      form.append('multi_select', String(formData.multi_select))
      form.append('icon', formData.icon)

      const result = category
        ? await updateCategory(category.id, form)
        : await createCategory(form)

      if (result.success) {
        alert('저장되었습니다.')
        onSave()
      } else {
        alert(result.error || '저장 실패')
      }
    } catch (err) {
      console.error('카테고리 저장 오류:', err)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">{category ? '카테고리 수정' : '카테고리 생성'}</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Slug *</label>
              <Input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tag Category ID</label>
              <Input
                type="text"
                value={formData.tag_category_id}
                onChange={(e) => setFormData({ ...formData, tag_category_id: e.target.value })}
                placeholder="외부 시스템 카테고리 ID"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">한글명 *</label>
              <Input
                type="text"
                value={formData.name_ko}
                onChange={(e) => setFormData({ ...formData, name_ko: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">영문명</label>
              <Input
                type="text"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">정렬순서</label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">아이콘</label>
              <Input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="lucide-react 아이콘명"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_facetable}
                onChange={(e) => setFormData({ ...formData, is_facetable: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">패싯 필터 사용</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.multi_select}
                onChange={(e) => setFormData({ ...formData, multi_select: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">다중 선택 허용</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              취소
            </Button>
            <Button type="submit" disabled={loading} className="cursor-pointer bg-purple-600 hover:bg-purple-700">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />저장 중...</> : '저장'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 태그 모달
interface TagModalProps {
  tag: TagType | null
  categories: TagCategory[]
  onClose: () => void
  onSave: () => void
}

function TagModal({ tag, categories, onClose, onSave }: TagModalProps) {
  const [formData, setFormData] = useState({
    slug: tag?.slug || '',
    name_ko: tag?.name_ko || '',
    name_en: tag?.name_en || '',
    category_id: tag?.category_id || '',
    tag_category_id: tag?.tag_category_id || '',
    synonyms_ko: Array.isArray(tag?.synonyms_ko) ? tag.synonyms_ko.join(', ') : '',
    synonyms_en: Array.isArray(tag?.synonyms_en) ? tag.synonyms_en.join(', ') : '',
    description_ko: tag?.description_ko || '',
    description_en: tag?.description_en || '',
    weight: tag?.weight ?? 0,
    is_active: tag?.is_active ?? true,
    icon: tag?.icon || ''
  })
  const [loading, setLoading] = useState(false)
  const [cities, setCities] = useState<Array<{ id: number; city_ko: string; city_en: string; city_slug: string }>>([])
  const [loadingCities, setLoadingCities] = useState(false)
  const [countries, setCountries] = useState<Array<{ id: number; country_ko: string; country_en: string; country_slug: string }>>([])
  const [loadingCountries, setLoadingCountries] = useState(false)
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [isGeneratingSlug, setIsGeneratingSlug] = useState(false)

  // 선택된 카테고리 확인
  const selectedCategory = categories.find(cat => cat.id === formData.category_id)
  const isTravelCityCategory = selectedCategory?.slug === 'travel-city' || selectedCategory?.name_ko?.includes('여행도시')
  const isTravelCountryCategory = selectedCategory?.slug === 'travel-country' || selectedCategory?.name_ko?.includes('여행지역')

  // 카테고리가 변경되면 해당 카테고리의 tag_category_id 자동 설정
  useEffect(() => {
    if (formData.category_id) {
      const category = categories.find(cat => cat.id === formData.category_id)
      if (category?.tag_category_id && category.tag_category_id !== formData.tag_category_id) {
        setFormData(prev => ({ ...prev, tag_category_id: category.tag_category_id || '' }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.category_id])

  // 여행도시 카테고리 선택 시 도시 목록 로드
  useEffect(() => {
    if (isTravelCityCategory) {
      const fetchCities = async () => {
        setLoadingCities(true)
        try {
          const response = await fetch('/api/regions?type=city&pageSize=1000&status=active')
          const result = await response.json()
          if (result.success && result.data) {
            // 중복 제거 (id 기준)
            const uniqueCities = result.data
              .filter((city: any) => city.city_ko && city.city_slug)
              .reduce((acc: any[], current: any) => {
                const isDuplicate = acc.some(item => item.id === current.id)
                if (!isDuplicate) {
                  acc.push(current)
                } else {
                  console.warn(`[TagModal] Duplicate city removed: id=${current.id}`)
                }
                return acc
              }, [])
            setCities(uniqueCities)
          }
        } catch (error) {
          console.error('도시 목록 로드 오류:', error)
        } finally {
          setLoadingCities(false)
        }
      }
      fetchCities()
    } else {
      setCities([])
    }
  }, [isTravelCityCategory])

  // 여행지역 카테고리 선택 시 국가 목록 로드
  useEffect(() => {
    if (isTravelCountryCategory) {
      const fetchCountries = async () => {
        setLoadingCountries(true)
        try {
          const response = await fetch('/api/regions?type=country&pageSize=1000&status=active')
          const result = await response.json()
          if (result.success && result.data) {
            // 중복 제거 (id 기준)
            const uniqueCountries = result.data
              .filter((country: any) => country.country_ko && country.country_slug)
              .reduce((acc: any[], current: any) => {
                const isDuplicate = acc.some(item => item.id === current.id)
                if (!isDuplicate) {
                  acc.push(current)
                } else {
                  console.warn(`[TagModal] Duplicate country removed: id=${current.id}`)
                }
                return acc
              }, [])
            setCountries(uniqueCountries)
          }
        } catch (error) {
          console.error('국가 목록 로드 오류:', error)
        } finally {
          setLoadingCountries(false)
        }
      }
      fetchCountries()
    } else {
      setCountries([])
    }
  }, [isTravelCountryCategory])

  // 도시 선택 시 한글명, 영문명, slug 자동 입력
  const handleCitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityId = parseInt(e.target.value)
    const selectedCity = cities.find(city => city.id === cityId)
    if (selectedCity) {
      setFormData(prev => ({
        ...prev,
        name_ko: selectedCity.city_ko,
        name_en: selectedCity.city_en || '',
        slug: selectedCity.city_slug || ''
      }))
    }
  }

  // 국가 선택 시 한글명, 영문명, slug 자동 입력
  const handleCountrySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryId = parseInt(e.target.value)
    const selectedCountry = countries.find(country => country.id === countryId)
    if (selectedCountry) {
      setFormData(prev => ({
        ...prev,
        name_ko: selectedCountry.country_ko,
        name_en: selectedCountry.country_en || '',
        slug: selectedCountry.country_slug || ''
      }))
    }
  }

  // AI로 설명 생성
  const handleGenerateDescription = async () => {
    if (!formData.name_ko.trim()) {
      alert('한글명을 먼저 입력해주세요.')
      return
    }

    setIsGeneratingDescription(true)
    try {
      const response = await fetch('/api/hashtags/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_name: selectedCategory?.name_ko || null,
          tag_name_ko: formData.name_ko.trim(),
        }),
      })

      const result = await response.json()

      if (result.success && result.data?.description_ko) {
        setFormData(prev => ({ ...prev, description_ko: result.data.description_ko }))
        alert('✅ AI 설명이 생성되었습니다!')
      } else {
        alert(`설명 생성 실패: ${result.error || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('설명 생성 오류:', error)
      alert('설명 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGeneratingDescription(false)
    }
  }

  // AI로 Slug 생성
  const handleGenerateSlug = async () => {
    if (!formData.name_ko.trim()) {
      alert('한글명을 먼저 입력해주세요.')
      return
    }

    setIsGeneratingSlug(true)
    try {
      const response = await fetch('/api/hashtags/generate-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_ko: formData.name_ko.trim(),
        }),
      })

      const result = await response.json()

      if (result.success && result.data?.slug) {
        setFormData(prev => ({ ...prev, slug: result.data.slug }))
        alert('✅ AI Slug가 생성되었습니다!')
      } else {
        alert(`Slug 생성 실패: ${result.error || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('Slug 생성 오류:', error)
      alert('Slug 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGeneratingSlug(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const form = new FormData()
      form.append('slug', formData.slug)
      form.append('name_ko', formData.name_ko)
      form.append('name_en', formData.name_en)
      form.append('category_id', formData.category_id)
      form.append('synonyms_ko', formData.synonyms_ko)
      form.append('synonyms_en', formData.synonyms_en)
      form.append('description_ko', formData.description_ko)
      form.append('description_en', formData.description_en)
      form.append('weight', String(formData.weight))
      form.append('is_active', String(formData.is_active))
      form.append('icon', formData.icon)

      const result = tag
        ? await updateTag(tag.id, form)
        : await createTag(form)

      if (result.success) {
        alert('저장되었습니다.')
        onSave()
      } else {
        alert(result.error || '저장 실패')
      }
    } catch (err) {
      console.error('태그 저장 오류:', err)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">{tag ? '태그 수정' : '태그 생성'}</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">카테고리 *</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">선택 안 함</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name_ko}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tag Category ID (자동 설정)</label>
              <Input
                type="text"
                value={formData.tag_category_id}
                onChange={(e) => setFormData({ ...formData, tag_category_id: e.target.value })}
                placeholder="카테고리 선택 시 자동으로 설정됩니다"
                className="bg-gray-50"
                readOnly
              />
            </div>
          </div>

          {/* 여행도시 카테고리 선택 시 도시 선택 UI */}
          {isTravelCityCategory && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                도시 선택 {loadingCities && <Loader2 className="inline h-3 w-3 animate-spin ml-2" />}
              </label>
              <select
                onChange={handleCitySelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={loadingCities}
              >
                <option value="">도시를 선택하세요 (한글명, 영문명, slug가 자동 입력됩니다)</option>
                {cities.map((city, index) => (
                  <option key={`city-${city.id}-${index}`} value={city.id}>
                    {city.city_ko} ({city.city_en}) - {city.city_slug}
                  </option>
                ))}
              </select>
              <p className="text-xs text-blue-700 mt-2">
                💡 도시를 선택하면 한글명, 영문명, Slug가 자동으로 입력됩니다.
              </p>
            </div>
          )}

          {/* 여행지역 카테고리 선택 시 국가 선택 UI */}
          {isTravelCountryCategory && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                국가 선택 {loadingCountries && <Loader2 className="inline h-3 w-3 animate-spin ml-2" />}
              </label>
              <select
                onChange={handleCountrySelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={loadingCountries}
              >
                <option value="">국가를 선택하세요 (한글명, 영문명, slug가 자동 입력됩니다)</option>
                {countries.map((country, index) => (
                  <option key={`country-${country.id}-${index}`} value={country.id}>
                    {country.country_ko} ({country.country_en}) - {country.country_slug}
                  </option>
                ))}
              </select>
              <p className="text-xs text-green-700 mt-2">
                💡 국가를 선택하면 한글명, 영문명, Slug가 자동으로 입력됩니다.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">한글명 *</label>
              <Input
                type="text"
                value={formData.name_ko}
                onChange={(e) => setFormData({ ...formData, name_ko: e.target.value })}
                placeholder={isTravelCityCategory ? "위에서 도시 선택 시 자동 입력" : isTravelCountryCategory ? "위에서 국가 선택 시 자동 입력" : ""}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">영문명</label>
              <Input
                type="text"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                placeholder={isTravelCityCategory ? "위에서 도시 선택 시 자동 입력" : isTravelCountryCategory ? "위에서 국가 선택 시 자동 입력" : ""}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Slug *</label>
                <button
                  type="button"
                  onClick={handleGenerateSlug}
                  disabled={isGeneratingSlug || !formData.name_ko.trim()}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGeneratingSlug ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      AI로 작성
                    </>
                  )}
                </button>
              </div>
              <Input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder={isTravelCityCategory ? "위에서 도시 선택 시 자동 입력" : isTravelCountryCategory ? "위에서 국가 선택 시 자동 입력" : "AI로 작성 가능"}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">가중치</label>
            <Input
              type="number"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">동의어 (한글)</label>
              <Input
                type="text"
                value={formData.synonyms_ko}
                onChange={(e) => setFormData({ ...formData, synonyms_ko: e.target.value })}
                placeholder="쉼표로 구분"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">동의어 (영문)</label>
              <Input
                type="text"
                value={formData.synonyms_en}
                onChange={(e) => setFormData({ ...formData, synonyms_en: e.target.value })}
                placeholder="쉼표로 구분"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">설명 (한글)</label>
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDescription || !formData.name_ko.trim()}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGeneratingDescription ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      AI로 작성
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={formData.description_ko}
                onChange={(e) => setFormData({ ...formData, description_ko: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="태그에 대한 설명... (또는 AI로 자동 생성)"
              />
              <p className="text-xs text-gray-500 mt-1">
                카테고리와 한글명을 입력한 후 'AI로 작성' 버튼을 누르세요.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">설명 (영문)</label>
              <textarea
                value={formData.description_en}
                onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">아이콘</label>
              <Input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="lucide-react 아이콘명"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">활성 상태</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              취소
            </Button>
            <Button type="submit" disabled={loading} className="cursor-pointer bg-purple-600 hover:bg-purple-700">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />저장 중...</> : '저장'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 호텔별 태그 그룹 타입
interface HotelTagGroup {
  sabre_id: number
  property_name_ko: string
  property_name_en: string
  tags: Array<{
    id: string
    tag_id: string
    tag_name_ko: string
    tag_name_en: string
    tag_slug: string
    category_name_ko: string
    created_at: string
  }>
}

const TAG_GRADE_PRIORITY_MAP: Record<string, number> = {
  최고급프리미엄: 1,
  럭셔리: 2,
  프리미엄: 3,
  가성비: 4,
  이코노미: 5,
}

const SECONDARY_PRIORITY_PATTERNS: Array<[RegExp, number]> = [
  [/역도보|역직결|중심가|해변|바다뷰|오션뷰|공항|셔틀|인접|도보/, 10],
  [/풀|수영장|스파|레스토랑|미슐랭|인피니티/, 20],
  [/키즈|유아|어린이|아기|패밀리룸|베이비시터|워터파크/, 30],
  [/객실|룸|서비스|버틀러|컨시어지|라운지|클럽플로어/, 40],
  [/분위기|감성|추천|여행|워케이션|힐링|로맨틱/, 50],
]

const normalizeTagName = (tagName?: string | null): string => {
  if (!tagName) return ''
  return tagName.replace(/\s+/g, '').toLowerCase()
}

const getDisplayTagPriority = (tagName?: string | null): number => {
  const normalized = normalizeTagName(tagName)
  if (!normalized) return 999

  if (TAG_GRADE_PRIORITY_MAP[normalized as keyof typeof TAG_GRADE_PRIORITY_MAP]) {
    return TAG_GRADE_PRIORITY_MAP[normalized as keyof typeof TAG_GRADE_PRIORITY_MAP]
  }

  for (const [pattern, priority] of SECONDARY_PRIORITY_PATTERNS) {
    if (pattern.test(normalized)) {
      return priority
    }
  }

  return 999
}

const sortTagsForDisplay = (tags: HotelTagGroup['tags']): HotelTagGroup['tags'] => {
  return [...tags].sort((a, b) => {
    const priorityA = getDisplayTagPriority(a.tag_name_ko)
    const priorityB = getDisplayTagPriority(b.tag_name_ko)

    if (priorityA === priorityB) {
      const nameA = normalizeTagName(a.tag_name_ko)
      const nameB = normalizeTagName(b.tag_name_ko)
      return nameA.localeCompare(nameB, 'ko')
    }

    return priorityA - priorityB
  })
}

// 호텔 태그 매핑 관리 컴포넌트
function HotelTagsManager() {
  const [hotelTags, setHotelTags] = useState<HotelTagMap[]>([])
  const [loading, setLoading] = useState(true)
  const [showExtractModal, setShowExtractModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [managingHotel, setManagingHotel] = useState<HotelTagGroup | null>(null)
  const [tagSearchTerm, setTagSearchTerm] = useState('')
  const [tagSearchLoading, setTagSearchLoading] = useState(false)
  const [tagSearchResults, setTagSearchResults] = useState<TagType[]>([])
  const [updating, setUpdating] = useState(false)
  const [reextractingId, setReextractingId] = useState<number | null>(null)

  const loadHotelTags = async () => {
    setLoading(true)
    try {
      const result = await getHotelTags(undefined, undefined)
      if (result.success && result.data) {
        setHotelTags(result.data)
        return result.data
      }
      return []
    } catch (err) {
      console.error('호텔 태그 매핑 로드 오류:', err)
      return []
    } finally {
      setLoading(false)
    }
  }

  const loadTagSearchResults = async (query: string) => {
    setTagSearchLoading(true)
    try {
      const result = await getTags(undefined, query)
      if (result.success && result.data) {
        setTagSearchResults(result.data)
      }
    } catch (err) {
      console.error('태그 검색 오류:', err)
    } finally {
      setTagSearchLoading(false)
    }
  }

  useEffect(() => {
    loadHotelTags()
  }, [])

  const groupedByHotel = React.useMemo(() => {
    const groups = new Map<number, HotelTagGroup>()

    hotelTags.forEach((item: any) => {
      const sabreId = item.sabre_id

      if (!groups.has(sabreId)) {
        groups.set(sabreId, {
          sabre_id: sabreId,
          property_name_ko: item.hotel?.property_name_ko || '',
          property_name_en: item.hotel?.property_name_en || '',
          tags: [],
        })
      }

      groups.get(sabreId)?.tags.push({
        id: item.id,
        tag_id: item.tag_id,
        tag_name_ko: item.tag?.name_ko || '',
        tag_name_en: item.tag?.name_en || '',
        tag_slug: item.tag?.slug || '',
        category_name_ko: item.tag?.category?.name_ko || '',
        created_at: item.created_at,
      })
    })

    return Array.from(groups.values())
  }, [hotelTags])

  useEffect(() => {
    if (!managingHotel) return
    const updatedGroup = groupedByHotel.find((group) => group.sabre_id === managingHotel.sabre_id)
    if (!updatedGroup) return
    const prevIds = managingHotel.tags.map((tag) => tag.id).sort().join(',')
    const nextIds = updatedGroup.tags.map((tag) => tag.id).sort().join(',')
    if (prevIds !== nextIds) {
      setManagingHotel(updatedGroup)
    }
  }, [groupedByHotel, managingHotel])

  // 검색 필터링
  const filteredGroups = groupedByHotel.filter((group) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      String(group.sabre_id).includes(search) ||
      group.property_name_ko?.toLowerCase().includes(search) ||
      group.property_name_en?.toLowerCase().includes(search) ||
      group.tags.some(tag => 
        tag.tag_name_ko?.toLowerCase().includes(search) ||
        tag.tag_name_en?.toLowerCase().includes(search) ||
        tag.tag_slug?.toLowerCase().includes(search)
      )
    )
  })

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="호텔명, Sabre ID 또는 태그명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button
          onClick={() => setShowExtractModal(true)}
          className="cursor-pointer bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          AI 해시태그 추출
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-32">Sabre ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">호텔명</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">태그</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                    {searchTerm ? '검색 결과가 없습니다.' : '매핑된 호텔 태그가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => (
                  <tr key={group.sabre_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-mono align-top">
                      {group.sabre_id}
                    </td>
                    <td className="px-4 py-4 text-sm align-top">
                      <div className="flex flex-col gap-1">
                        <div className="font-medium text-gray-900">{group.property_name_ko || '-'}</div>
                        <div className="text-xs text-gray-500">{group.property_name_en || '-'}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="cursor-pointer"
                            disabled={updating || reextractingId === group.sabre_id}
                            onClick={async () => {
                              if (!confirm('이 호텔의 태그를 다시 추출하여 추가하시겠습니까?\n기존 태그는 유지되고 새로 추출된 태그만 추가됩니다.')) return
                              setReextractingId(group.sabre_id)
                              try {
                                const response = await fetch('/api/hashtags/extract', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ sabre_id: group.sabre_id, append: true }),
                                })

                                const result = await response.json()

                                if (result.success) {
                                  const addedCount = result.data?.count ?? result.data?.tags?.length ?? 0
                                  alert(`✅ 태그가 다시 추출되었습니다.\n- 새로 추출된 태그: ${addedCount}개`)
                                  await loadHotelTags()
                                } else {
                                  alert(result.error || '태그 재추출에 실패했습니다.')
                                }
                              } catch (error) {
                                console.error('태그 재추출 오류:', error)
                                alert('태그 재추출 중 오류가 발생했습니다.')
                              } finally {
                                setReextractingId(null)
                              }
                            }}
                          >
                            {reextractingId === group.sabre_id ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> 재추출 중...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 mr-1" /> 다시 추출
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => {
                              setManagingHotel(group)
                              setTagSearchTerm('')
                              setTagSearchResults([])
                              loadTagSearchResults('')
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" /> 태그 추가
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="cursor-pointer text-red-600 hover:bg-red-50"
                            disabled={updating}
                            onClick={async () => {
                              if (!confirm('이 호텔의 태그를 모두 삭제하시겠습니까?')) return
                              setUpdating(true)
                              try {
                                const result = await deleteAllHotelTags(String(group.sabre_id))
                                if (!result.success) {
                                  alert(result.error || '태그 삭제 중 오류가 발생했습니다.')
                                }
                                await loadHotelTags()
                              } finally {
                                setUpdating(false)
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> 전체 삭제
                          </Button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {sortTagsForDisplay(group.tags).map((tag) => (
                          <div key={tag.id} className="inline-flex flex-col gap-1 p-2 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium flex items-center gap-2">
                              <span>
                                {tag.tag_name_ko}
                                {tag.tag_name_en && <span className="text-purple-600 ml-1">({tag.tag_name_en})</span>}
                              </span>
                              <button
                                type="button"
                                className="text-purple-400 hover:text-purple-600"
                                title="태그 삭제"
                                onClick={async () => {
                                  if (!confirm('이 태그를 삭제하시겠습니까?')) return
                                  setUpdating(true)
                                  try {
                                    const result = await deleteHotelTag(String(group.sabre_id), tag.tag_id)
                                    if (!result.success) {
                                      alert(result.error || '태그 삭제 중 오류가 발생했습니다.')
                                    }
                                    await loadHotelTags()
                                  } finally {
                                    setUpdating(false)
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            {tag.category_name_ko && (
                              <div className="text-xs text-gray-500 px-1 flex items-center gap-1">
                                <Folder className="h-3 w-3" />
                                {tag.category_name_ko}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showExtractModal && (
        <HotelTagExtractModal
          onClose={() => setShowExtractModal(false)}
          onSuccess={() => {
            loadHotelTags()
            setShowExtractModal(false)
          }}
        />
      )}
      {managingHotel && (
        <HotelTagManageModal
          hotel={managingHotel}
          onClose={() => {
            setManagingHotel(null)
            setTagSearchResults([])
            setTagSearchTerm('')
          }}
          onTagAdded={async () => {
            await loadHotelTags()
          }}
          existingTags={managingHotel.tags}
          searchTerm={tagSearchTerm}
          onSearchChange={(value) => {
            setTagSearchTerm(value)
            loadTagSearchResults(value)
          }}
          searchLoading={tagSearchLoading}
          searchResults={tagSearchResults}
          updating={updating}
          setUpdating={setUpdating}
        />
      )}
    </div>
  )
}

interface HotelTagManageModalProps {
  hotel: HotelTagGroup
  onClose: () => void
  onTagAdded: () => Promise<void>
  existingTags: HotelTagGroup['tags']
  searchTerm: string
  onSearchChange: (value: string) => void
  searchLoading: boolean
  searchResults: TagType[]
  updating: boolean
  setUpdating: (value: boolean) => void
}

function HotelTagManageModal({
  hotel,
  onClose,
  onTagAdded,
  existingTags,
  searchTerm,
  onSearchChange,
  searchLoading,
  searchResults,
  updating,
  setUpdating,
}: HotelTagManageModalProps) {
  const existingTagIds = React.useMemo(() => new Set(existingTags.map((tag) => tag.tag_id)), [existingTags])

  const handleAddTag = async (tagId: string) => {
    if (!tagId) return
    if (existingTagIds.has(tagId)) {
      alert('이미 추가된 태그입니다.')
      return
    }

    setUpdating(true)
    try {
      const result = await createHotelTag(String(hotel.sabre_id), tagId)
      if (!result.success) {
        alert(result.error || '태그 추가 중 오류가 발생했습니다.')
        return
      }
      await onTagAdded()
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">태그 관리</h3>
            <p className="text-sm text-gray-500 mt-1">
              {hotel.property_name_ko || hotel.property_name_en} ({hotel.sabre_id})
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
            닫기
          </Button>
        </div>

        <div className="flex flex-col gap-6 p-6 overflow-y-auto">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">현재 태그</h4>
            {existingTags.length === 0 ? (
              <div className="text-sm text-gray-500">등록된 태그가 없습니다.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sortTagsForDisplay(existingTags).map((tag) => (
                  <div key={tag.id} className="inline-flex flex-col gap-1 p-2 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium flex items-center gap-2">
                      <span>
                        {tag.tag_name_ko}
                        {tag.tag_name_en && <span className="text-purple-600 ml-1">({tag.tag_name_en})</span>}
                      </span>
                      <button
                        type="button"
                        className="text-purple-400 hover:text-purple-600"
                        title="태그 삭제"
                        onClick={async () => {
                          if (!confirm('이 태그를 삭제하시겠습니까?')) return
                          setUpdating(true)
                          try {
                            const result = await deleteHotelTag(String(hotel.sabre_id), tag.tag_id)
                            if (!result.success) {
                              alert(result.error || '태그 삭제 중 오류가 발생했습니다.')
                            }
                            await onTagAdded()
                          } finally {
                            setUpdating(false)
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    {tag.category_name_ko && (
                      <div className="text-xs text-gray-500 px-1 flex items-center gap-1">
                        <Folder className="h-3 w-3" />
                        {tag.category_name_ko}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">태그 추가</h4>
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="태그명 검색..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="max-h-64 overflow-y-auto border rounded-lg p-3 space-y-2">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> 검색 중...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-sm text-gray-500">검색 결과가 없습니다.</div>
                ) : (
                  searchResults.map((tag: TagType) => {
                    const alreadyAdded = existingTagIds.has(tag.id)
                    return (
                      <div key={tag.id} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded">
                        <div>
                          <div className="text-sm font-medium text-gray-800">{tag.name_ko}</div>
                          <div className="text-xs text-gray-500">{tag.name_en || '-'}</div>
                        </div>
                        <Button
                          size="sm"
                          className="cursor-pointer"
                          disabled={alreadyAdded || updating}
                          onClick={() => handleAddTag(tag.id)}
                        >
                          {alreadyAdded ? '추가됨' : '추가'}
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 호텔 태그 추출 모달
interface HotelTagExtractModalProps {
  onClose: () => void
  onSuccess: () => void
}

function HotelTagExtractModal({ onClose, onSuccess }: HotelTagExtractModalProps) {
  const [selectedHotel, setSelectedHotel] = useState<{ sabre_id: string; property_name_ko: string; property_name_en: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [extracting, setExtracting] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const response = await fetch(`/api/hotel/search?q=${encodeURIComponent(searchQuery.trim())}`)
      const result = await response.json()
      if (result.success && result.data) {
        setSearchResults(result.data)
      }
    } catch (err) {
      console.error('호텔 검색 오류:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleExtract = async () => {
    if (!selectedHotel) {
      alert('호텔을 먼저 선택해주세요.')
      return
    }

    if (!confirm(`"${selectedHotel.property_name_ko}" 호텔의 해시태그를 AI로 추출하시겠습니까?\n기존 태그는 삭제되고 새로 생성됩니다.`)) {
      return
    }

    setExtracting(true)
    try {
      const response = await fetch('/api/hashtags/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sabre_id: selectedHotel.sabre_id })
      })

      const result = await response.json()

      if (result.success) {
        alert(`✅ ${result.data.count}개의 태그가 추출되었습니다!`)
        onSuccess()
      } else {
        alert(`추출 실패: ${result.error}`)
      }
    } catch (err) {
      console.error('태그 추출 오류:', err)
      alert('태그 추출 중 오류가 발생했습니다.')
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI 해시태그 추출
          </h3>
          <p className="text-sm text-gray-600 mt-1">호텔을 검색하고 AI로 자동으로 태그를 추출합니다.</p>
        </div>

        <div className="p-6 space-y-4">
          {/* 호텔 검색 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">호텔 검색</label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="호텔명 또는 Sabre ID 입력..."
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleSearch}
                disabled={searching}
                className="cursor-pointer"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* 검색 결과 */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {searchResults.map((hotel) => (
                <button
                  key={hotel.sabre_id}
                  type="button"
                  onClick={() => {
                    setSelectedHotel(hotel)
                    setSearchResults([])
                    setSearchQuery('')
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                >
                  <div className="font-medium text-gray-900">{hotel.property_name_ko}</div>
                  <div className="text-sm text-gray-600">{hotel.property_name_en}</div>
                  <div className="text-xs text-gray-500">Sabre ID: {hotel.sabre_id}</div>
                </button>
              ))}
            </div>
          )}

          {/* 선택된 호텔 */}
          {selectedHotel && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-900">{selectedHotel.property_name_ko}</div>
                  <div className="text-sm text-gray-600">{selectedHotel.property_name_en}</div>
                  <div className="text-xs text-gray-500 mt-1">Sabre ID: {selectedHotel.sabre_id}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHotel(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
            취소
          </Button>
          <Button
            type="button"
            onClick={handleExtract}
            disabled={!selectedHotel || extracting}
            className="cursor-pointer bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {extracting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                추출 중...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                AI 해시태그 추출
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
