'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, Search, Edit, Trash2, Wand2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { TopicPageWithHotels } from '@/types/topic-page'
import { getTopicPagesList, deleteTopicPage } from '@/features/recommendation-pages/actions'
import { generateTopicPagesFromTags, generateCustomTopicPage } from '@/features/recommendation-pages/ai-actions'
import { Button } from '@/components/ui/button'

type StatusFilter = 'all' | 'draft' | 'published' | 'archived'

// 상태 배지 렌더링
const getStatusBadge = (status: string) => {
  const styles = {
    draft: 'bg-gray-100 text-gray-700',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-orange-100 text-orange-700',
  }
  const labels = {
    draft: '임시저장',
    published: '발행됨',
    archived: '보관됨',
  }
  return (
    <span className={cn('px-2 py-1 rounded-md text-xs font-medium', styles[status as keyof typeof styles] || styles.draft)}>
      {labels[status as keyof typeof labels] || status}
    </span>
  )
}

export default function TopicPagesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchInput, setSearchInput] = useState('')
  const [topicPages, setTopicPages] = useState<TopicPageWithHotels[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 추천 페이지 목록 조회
  const loadTopicPages = async () => {
    setIsLoading(true)
    setError(null)
    try {
      console.log('📋 추천 페이지 목록 조회 시작...', { statusFilter, searchInput })
      const result = await getTopicPagesList(
        statusFilter !== 'all' ? statusFilter : undefined,
        searchInput.trim() || undefined,
        false
      )
      console.log('📋 조회 결과:', result)
      
      if (result.success && result.data) {
        // 중복 제거 (id 기준)
        const rawPages = result.data as TopicPageWithHotels[]
        console.log('📋 원본 데이터 개수:', rawPages.length)
        const uniquePages = rawPages.reduce((acc: TopicPageWithHotels[], current) => {
          const isDuplicate = acc.some(item => item.id === current.id)
          if (!isDuplicate) {
            acc.push(current)
          } else {
            console.warn(`[TopicPagesPage] Duplicate page removed: id=${current.id}`)
          }
          return acc
        }, [])
        console.log('📋 중복 제거 후 데이터 개수:', uniquePages.length)
        setTopicPages(uniquePages)
      } else {
        console.error('❌ 조회 실패:', result.error)
        setError(result.error || '데이터를 불러오는데 실패했습니다.')
      }
    } catch (err) {
      console.error('❌ 추천 페이지 로드 오류:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTopicPages()
  }, [statusFilter, searchInput])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 추천 페이지를 삭제하시겠습니까?\n연결된 호텔 정보도 함께 삭제됩니다.`)) return

    setIsDeleting(true)
    try {
      const result = await deleteTopicPage(id)
      if (result.success) {
        alert('추천 페이지가 삭제되었습니다.')
        loadTopicPages()
      } else {
        alert(`삭제 실패: ${result.error}`)
      }
    } catch (err) {
      console.error('삭제 오류:', err)
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              호텔 추천 페이지 관리
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              테마별 호텔 큐레이션 페이지를 관리합니다.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={async () => {
              if (!confirm('태그와 카테고리를 기반으로 추천 페이지를 자동 생성하시겠습니까?\n이 작업은 1~2분 정도 소요됩니다.')) return
              
              setIsGenerating(true)
              try {
                const result = await generateTopicPagesFromTags()
                
                if (result.success && result.data) {
                  alert(`✅ 추천 페이지 생성 완료!\n- 생성된 페이지: ${result.data.created}개\n- 건너뛴 페이지: ${result.data.skipped}개`)
                  loadTopicPages()
                } else {
                  alert(`생성 실패: ${result.error}`)
                }
              } catch (err) {
                console.error('추천 페이지 생성 오류:', err)
                alert('추천 페이지 생성 중 오류가 발생했습니다.')
              } finally {
                setIsGenerating(false)
              }
            }}
            disabled={isGenerating}
            className="cursor-pointer bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                태그 기반 페이지 생성
              </>
            )}
          </Button>
          <Button
            onClick={() => setShowCustomModal(true)}
            className="cursor-pointer bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            직접 태그 조합 페이지 생성
          </Button>
          <Link
            href="/admin/recommendation-pages/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            새 추천 페이지
          </Link>
        </div>
      </div>
      
      {showCustomModal && (
        <CustomTopicPageModal
          onClose={() => setShowCustomModal(false)}
          onSuccess={() => {
            setShowCustomModal(false)
            loadTopicPages()
          }}
        />
      )}

      {/* 필터 & 검색 */}
      <div className="rounded-lg border bg-white p-4 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* 상태 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">상태:</span>
            <div className="flex gap-2">
              {(['all', 'draft', 'published', 'archived'] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {status === 'all' ? '전체' : status === 'draft' ? '임시저장' : status === 'published' ? '발행됨' : '보관됨'}
                </button>
              ))}
            </div>
          </div>

          {/* 검색 */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="slug 또는 제목으로 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 통계 */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FileText className="h-4 w-4" />
          <span>총 <strong className="text-gray-900">{topicPages.length}</strong>개 추천 페이지</span>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            <strong>오류:</strong> {error}
          </p>
        </div>
      )}

      {/* 테이블 */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  제목 / Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  배포
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  호텔 수
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  발행일
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  생성일
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : topicPages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    {searchInput ? '검색 결과가 없습니다.' : '생성된 추천 페이지가 없습니다.'}
                  </td>
                </tr>
              ) : (
                topicPages.map((page) => (
                  <tr key={page.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-900">{page.title_ko}</span>
                        <span className="text-xs text-gray-500 font-mono">/{page.slug}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(page.status || 'draft')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        page.publish
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      )}>
                        {page.publish ? '배포됨' : '미배포'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{page.hotel_count || 0}개</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {page.publish_at ? new Date(page.publish_at).toLocaleDateString('ko-KR') : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {new Date(page.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/recommendation-pages/${page.id}`}
                          className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                          title="상세/편집"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(page.id, page.title_ko)}
                          disabled={isDeleting}
                          className="p-2 rounded-md text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// 직접 태그 조합 페이지 생성 모달
interface CustomTopicPageModalProps {
  onClose: () => void
  onSuccess: () => void
}

function CustomTopicPageModal({ onClose, onSuccess }: CustomTopicPageModalProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [allTags, setAllTags] = useState<any[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [tagsLoading, setTagsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    slug: '',
    title_ko: '',
    intro_ko: '',
  })

  // 카테고리 로드
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/hashtags/categories')
        const result = await response.json()
        if (result.success && result.data) {
          setCategories(result.data.filter((cat: any) => cat.slug !== 'ai-extracted'))
        }
      } catch (err) {
        console.error('카테고리 로드 오류:', err)
      }
    }
    loadCategories()
  }, [])

  // 선택된 카테고리 변경 시 태그 로드
  useEffect(() => {
    if (selectedCategories.size === 0) {
      setAllTags([])
      return
    }

    const loadTags = async () => {
      setTagsLoading(true)
      try {
        // 선택된 모든 카테고리의 태그 로드
        const tagPromises = Array.from(selectedCategories).map(async (categoryId) => {
          const response = await fetch(`/api/hashtags/tags?category_id=${categoryId}`)
          const result = await response.json()
          return result.success ? result.data.filter((tag: any) => tag.is_active) : []
        })
        
        const tagsArrays = await Promise.all(tagPromises)
        const mergedTags = tagsArrays.flat()
        
        // 중복 제거 (id 기준)
        const uniqueTags = Array.from(
          new Map(mergedTags.map((tag: any) => [tag.id, tag])).values()
        )
        
        setAllTags(uniqueTags)
      } catch (err) {
        console.error('태그 로드 오류:', err)
      } finally {
        setTagsLoading(false)
      }
    }
    loadTags()
  }, [selectedCategories])
  
  const handleToggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategories)
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId)
    } else {
      newSelected.add(categoryId)
    }
    setSelectedCategories(newSelected)
  }

  const handleToggleTag = (tagId: string) => {
    const newSelected = new Set(selectedTags)
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId)
    } else {
      newSelected.add(tagId)
    }
    setSelectedTags(newSelected)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedTags.size === 0) {
      alert('최소 1개 이상의 태그를 선택해주세요.')
      return
    }

    if (!formData.slug || !formData.title_ko) {
      alert('Slug와 제목은 필수입니다.')
      return
    }

    setLoading(true)
    try {
      const selectedTagObjects = allTags.filter((tag) => selectedTags.has(tag.id))
      const tagNames = selectedTagObjects.map((tag) => tag.name_ko)

      const result = await generateCustomTopicPage({
        slug: formData.slug,
        title_ko: formData.title_ko,
        intro_ko: formData.intro_ko,
        tag_ids: Array.from(selectedTags),
        tag_names: tagNames,
      })

      if (result.success && result.data) {
        alert(`✅ 추천 페이지 생성 완료!\n- 연결된 호텔: ${result.data.connectedHotels}개`)
        onSuccess()
      } else {
        alert(`생성 실패: ${result.error}`)
      }
    } catch (err) {
      console.error('페이지 생성 오류:', err)
      alert('페이지 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">직접 태그 조합 페이지 생성</h3>
          <p className="text-sm text-gray-600 mt-1">원하는 태그를 선택하여 커스텀 추천 페이지를 생성합니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slug *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="french-style-hotels"
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">제목 (한글) *</label>
                <input
                  type="text"
                  value={formData.title_ko}
                  onChange={(e) => setFormData({ ...formData, title_ko: e.target.value })}
                  placeholder="프랑스 스타일 호텔"
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">소개 글</label>
              <textarea
                value={formData.intro_ko}
                onChange={(e) => setFormData({ ...formData, intro_ko: e.target.value })}
                placeholder="페이지 소개 내용을 입력하세요..."
                rows={3}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            {/* 카테고리 선택 (복수) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                카테고리 선택 ({selectedCategories.size}개 선택됨)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border rounded-lg bg-gray-50">
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded border cursor-pointer transition-colors",
                      selectedCategories.has(cat.id)
                        ? "bg-blue-50 border-blue-300"
                        : "bg-white hover:bg-gray-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(cat.id)}
                      onChange={() => handleToggleCategory(cat.id)}
                      className="rounded"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{cat.name_ko}</span>
                      <span className="text-xs text-gray-500">{cat.name_en}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 태그 선택 */}
            {selectedCategories.size > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  태그 선택 ({selectedTags.size}개 선택됨)
                </label>
                {tagsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : allTags.length === 0 ? (
                  <div className="text-sm text-gray-500 py-4">선택한 카테고리에 활성 태그가 없습니다.</div>
                ) : (
                  <div className="space-y-4">
                    {/* 카테고리별로 그룹화하여 표시 */}
                    {categories
                      .filter((cat) => selectedCategories.has(cat.id))
                      .map((cat) => {
                        const categoryTags = allTags.filter((tag: any) => tag.category_id === cat.id)
                        if (categoryTags.length === 0) return null
                        
                        return (
                          <div key={cat.id}>
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              {cat.name_ko} ({categoryTags.length}개)
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {categoryTags.map((tag: any) => (
                                <label
                                  key={tag.id}
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors",
                                    selectedTags.has(tag.id)
                                      ? "bg-purple-50 border-purple-300"
                                      : "bg-white hover:bg-gray-50"
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedTags.has(tag.id)}
                                    onChange={() => handleToggleTag(tag.id)}
                                    className="rounded"
                                  />
                                  <span className="text-sm">{tag.name_ko}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )}

            {/* 선택된 태그 미리보기 */}
            {selectedTags.size > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">선택된 태그</label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
                  {allTags
                    .filter((tag) => selectedTags.has(tag.id))
                    .map((tag) => (
                      <span
                        key={tag.id}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                      >
                        {tag.name_ko}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedTags.size === 0}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  페이지 생성
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

