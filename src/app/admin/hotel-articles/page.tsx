'use client'

import React, { useState, useEffect } from 'react'
import { 
  Newspaper, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2,
  Calendar
} from 'lucide-react'
import { AuthGuard } from '@/components/shared/auth-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HotelAutocomplete } from '@/components/shared/hotel-autocomplete'
import { cn } from '@/lib/utils'

interface HotelBlog {
  id: number
  slug: string
  publish: boolean
  main_title: string
  sub_title: string
  main_image: string
  s1_contents: string
  s2_contents: string
  s3_contents: string
  s4_contents: string
  s5_contents: string
  s6_contents: string
  s7_contents: string
  s8_contents: string
  s9_contents: string
  s10_contents: string
  s11_contents: string
  s12_contents: string
  s1_sabre_id: string
  s2_sabre_id: string
  s3_sabre_id: string
  s4_sabre_id: string
  s5_sabre_id: string
  s6_sabre_id: string
  s7_sabre_id: string
  s8_sabre_id: string
  s9_sabre_id: string
  s10_sabre_id: string
  s11_sabre_id: string
  s12_sabre_id: string
  created_at: string
  updated_at: string
}

export default function AdminHotelArticlesPage() {
  return (
    <AuthGuard requiredRole="admin">
      <HotelBlogsManager />
    </AuthGuard>
  )
}

function HotelBlogsManager() {
  const [blogs, setBlogs] = useState<HotelBlog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [publishFilter, setPublishFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBlog, setEditingBlog] = useState<HotelBlog | null>(null)

  // 블로그 목록 로드
  const loadBlogs = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '5'
      })

      if (searchTerm) params.append('search', searchTerm)
      if (publishFilter) params.append('publish', publishFilter)

      const response = await fetch(`/api/hotel-articles?${params}`)
      const result = await response.json()

      if (result.success) {
        // 중복 제거 후 updated_at 기준으로 정렬 (최신 수정일이 먼저)
        const uniqueBlogs = result.data.filter((blog: HotelBlog, index: number, self: HotelBlog[]) => 
          index === self.findIndex((b: HotelBlog) => b.id === blog.id)
        )
        const sortedBlogs = uniqueBlogs.sort((a: HotelBlog, b: HotelBlog) => {
          // updated_at 기준으로 내림차순 정렬 (최신 수정일이 먼저)
          const dateA = new Date(a.updated_at).getTime()
          const dateB = new Date(b.updated_at).getTime()
          if (dateB !== dateA) {
            return dateB - dateA // updated_at 내림차순
          }
          // updated_at이 같으면 id 기준으로 내림차순
          return b.id - a.id
        })
        setBlogs(sortedBlogs)
        setTotalPages(result.pagination.totalPages)
        setTotalCount(result.pagination.total)
      } else {
        setError(result.error || '블로그를 불러올 수 없습니다.')
      }
    } catch (err) {
      console.error('블로그 로드 오류:', err)
      setError('블로그를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBlogs()
  }, [currentPage, searchTerm, publishFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // 블로그 삭제
  const handleDelete = async (id: number) => {
    if (!confirm('정말로 이 블로그를 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/hotel-articles/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        loadBlogs()
        alert('블로그가 성공적으로 삭제되었습니다.')
      } else {
        alert(result.error || '블로그 삭제에 실패했습니다.')
      }
    } catch (err) {
      console.error('블로그 삭제 오류:', err)
      alert('블로그 삭제 중 오류가 발생했습니다.')
    }
  }

  // 발행 상태 변경
  const handlePublishChange = async (id: number, newPublish: boolean) => {
    try {
      const response = await fetch(`/api/hotel-articles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ publish: newPublish })
      })

      const result = await response.json()

      if (result.success) {
        loadBlogs()
      } else {
        alert(result.error || '발행 상태 변경에 실패했습니다.')
      }
    } catch (err) {
      console.error('발행 상태 변경 오류:', err)
      alert('발행 상태 변경 중 오류가 발생했습니다.')
    }
  }

  const getPublishColor = (publish: boolean) => {
    return publish ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
  }

  const getPublishText = (publish: boolean) => {
    return publish ? '발행됨' : '초안'
  }

  return (
    <div className="min-h-[60vh]">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <Newspaper className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">호텔 블로그 관리</h1>
          <p className="text-sm text-gray-600 mt-1">호텔 관련 블로그 게시물을 관리합니다.</p>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-6 bg-white rounded-lg border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="블로그 제목 또는 부제목 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={publishFilter}
              onChange={(e) => setPublishFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 상태</option>
              <option value="true">발행됨</option>
              <option value="false">초안</option>
            </select>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            새 블로그
          </Button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 블로그 목록 */}
      <div className="bg-white rounded-lg border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">블로그를 불러오는 중...</span>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Newspaper className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>등록된 블로그가 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {blogs.map((blog, index) => (
              <div key={`blog-${blog.id}-${index}`} className="p-6 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  {/* 대표 이미지 */}
                  <div className="flex-shrink-0">
                    {blog.main_image ? (
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={blog.main_image}
                          alt={blog.main_title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            target.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                        <div className="w-full h-full items-center justify-center bg-gray-100 text-gray-400" style={{ display: 'none' }}>
                          <Newspaper className="h-8 w-8" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                        <Newspaper className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {/* 블로그 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 truncate">{blog.main_title}</h3>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium flex-shrink-0",
                        getPublishColor(blog.publish)
                      )}>
                        {getPublishText(blog.publish)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(blog.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-gray-600">
                        Slug: {blog.slug}
                      </div>
                    </div>

                    {blog.sub_title && (
                      <p className="text-gray-600 mb-3 text-sm line-clamp-1">
                        {blog.sub_title}
                      </p>
                    )}

                    {blog.s1_contents && (
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {blog.s1_contents.replace(/<[^>]*>/g, '').substring(0, 200)}...
                      </p>
                    )}
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingBlog(blog)
                        setShowEditModal(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <button
                      onClick={() => handlePublishChange(blog.id, !blog.publish)}
                      className={cn(
                        "text-xs px-2 py-1 border rounded",
                        blog.publish 
                          ? "bg-green-100 text-green-800 border-green-200" 
                          : "bg-yellow-100 text-yellow-800 border-yellow-200"
                      )}
                    >
                      {blog.publish ? '발행됨' : '초안'}
                    </button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(blog.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                총 {totalCount}개의 블로그 (페이지 {currentPage} / {totalPages})
              </div>
              <div className="flex items-center gap-2">
                {/* 첫 페이지로 */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2"
                >
                  «
                </Button>
                
                {/* 이전 페이지 */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  이전
                </Button>

                {/* 페이지 번호들 */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const pages = []
                    const startPage = Math.max(1, currentPage - 2)
                    const endPage = Math.min(totalPages, currentPage + 2)
                    
                    // 첫 페이지가 1이 아니면 ... 표시
                    if (startPage > 1) {
                      pages.push(
                        <Button
                          key={1}
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage(1)}
                          className="px-3"
                        >
                          1
                        </Button>
                      )
                      if (startPage > 2) {
                        pages.push(
                          <span key="ellipsis1" className="px-2 text-gray-500">
                            ...
                          </span>
                        )
                      }
                    }
                    
                    // 중간 페이지들
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          size="sm"
                          variant={i === currentPage ? "default" : "outline"}
                          onClick={() => setCurrentPage(i)}
                          className="px-3"
                        >
                          {i}
                        </Button>
                      )
                    }
                    
                    // 마지막 페이지가 끝이 아니면 ... 표시
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(
                          <span key="ellipsis2" className="px-2 text-gray-500">
                            ...
                          </span>
                        )
                      }
                      pages.push(
                        <Button
                          key={totalPages}
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-3"
                        >
                          {totalPages}
                        </Button>
                      )
                    }
                    
                    return pages
                  })()}
                </div>

                {/* 다음 페이지 */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  다음
                </Button>
                
                {/* 마지막 페이지로 */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2"
                >
                  »
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 블로그 생성/편집 모달 */}
      {(showCreateModal || showEditModal) && (
        <BlogModal
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false)
            setShowEditModal(false)
            setEditingBlog(null)
          }}
          blog={editingBlog}
          onSave={() => {
            loadBlogs()
            setShowCreateModal(false)
            setShowEditModal(false)
            setEditingBlog(null)
          }}
        />
      )}
    </div>
  )
}

// 블로그 생성/편집 모달 컴포넌트
interface BlogModalProps {
  isOpen: boolean
  onClose: () => void
  blog?: HotelBlog | null
  onSave: () => void
}

function BlogModal({ isOpen, onClose, blog, onSave }: BlogModalProps) {
  const [formData, setFormData] = useState({
    slug: blog?.slug || '',
    publish: blog?.publish || false,
    main_title: blog?.main_title || '',
    sub_title: blog?.sub_title || '',
    main_image: blog?.main_image || '',
    s1_contents: blog?.s1_contents || '',
    s2_contents: blog?.s2_contents || '',
    s3_contents: blog?.s3_contents || '',
    s4_contents: blog?.s4_contents || '',
    s5_contents: blog?.s5_contents || '',
    s6_contents: blog?.s6_contents || '',
    s7_contents: blog?.s7_contents || '',
    s8_contents: blog?.s8_contents || '',
    s9_contents: blog?.s9_contents || '',
    s10_contents: blog?.s10_contents || '',
    s11_contents: blog?.s11_contents || '',
    s12_contents: blog?.s12_contents || '',
    s1_sabre_id: blog?.s1_sabre_id || '',
    s2_sabre_id: blog?.s2_sabre_id || '',
    s3_sabre_id: blog?.s3_sabre_id || '',
    s4_sabre_id: blog?.s4_sabre_id || '',
    s5_sabre_id: blog?.s5_sabre_id || '',
    s6_sabre_id: blog?.s6_sabre_id || '',
    s7_sabre_id: blog?.s7_sabre_id || '',
    s8_sabre_id: blog?.s8_sabre_id || '',
    s9_sabre_id: blog?.s9_sabre_id || '',
    s10_sabre_id: blog?.s10_sabre_id || '',
    s11_sabre_id: blog?.s11_sabre_id || '',
    s12_sabre_id: blog?.s12_sabre_id || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hotelInfo, setHotelInfo] = useState<Record<string, { sabre_id: string; property_name_ko: string; property_name_en: string }>>({})

  // 호텔 정보 로드
  const loadHotelInfo = async () => {
    const sabreIds = [
      formData.s1_sabre_id,
      formData.s2_sabre_id,
      formData.s3_sabre_id,
      formData.s4_sabre_id,
      formData.s5_sabre_id,
      formData.s6_sabre_id,
      formData.s7_sabre_id,
      formData.s8_sabre_id,
      formData.s9_sabre_id,
      formData.s10_sabre_id,
      formData.s11_sabre_id,
      formData.s12_sabre_id
    ].filter(id => id && String(id).trim())
      .map(id => String(id).trim())

    if (sabreIds.length === 0) {
      setHotelInfo({})
      return
    }

    try {
      const response = await fetch('/api/hotel-articles/hotel-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sabreIds })
      })

      const result = await response.json()
      console.log('호텔 정보 로드 응답:', result)
      if (result.success) {
        console.log('호텔 정보 설정:', result.data)
        setHotelInfo(result.data)
      }
    } catch (err) {
      console.error('호텔 정보 로드 오류:', err)
    }
  }

  // Sabre ID 변경 시 호텔 정보 로드
  useEffect(() => {
    if (isOpen) {
      loadHotelInfo()
    }
  }, [formData.s1_sabre_id, formData.s2_sabre_id, formData.s3_sabre_id, formData.s4_sabre_id, formData.s5_sabre_id, formData.s6_sabre_id, formData.s7_sabre_id, formData.s8_sabre_id, formData.s9_sabre_id, formData.s10_sabre_id, formData.s11_sabre_id, formData.s12_sabre_id, isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = blog ? `/api/hotel-articles/${blog.id}` : '/api/hotel-articles'
      const method = blog ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        onSave()
        alert(blog ? '블로그가 성공적으로 수정되었습니다.' : '블로그가 성공적으로 생성되었습니다.')
      } else {
        setError(result.error || '저장에 실패했습니다.')
      }
    } catch (err) {
      console.error('블로그 저장 오류:', err)
      setError('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(95vw,1000px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {blog ? '블로그 편집' : '새 블로그 생성'}
          </h2>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug *
              </label>
              <Input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="블로그 슬러그를 입력하세요"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="publish"
                checked={formData.publish}
                onChange={(e) => setFormData(prev => ({ ...prev, publish: e.target.checked }))}
                className="h-4 w-4 text-blue-600"
              />
              <label htmlFor="publish" className="text-sm font-medium text-gray-700">
                발행
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메인 제목 *
            </label>
            <Input
              type="text"
              value={formData.main_title}
              onChange={(e) => setFormData(prev => ({ ...prev, main_title: e.target.value }))}
              placeholder="메인 제목을 입력하세요"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              부제목
            </label>
            <Input
              type="text"
              value={formData.sub_title}
              onChange={(e) => setFormData(prev => ({ ...prev, sub_title: e.target.value }))}
              placeholder="부제목을 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메인 이미지 URL
            </label>
            <Input
              type="url"
              value={formData.main_image}
              onChange={(e) => setFormData(prev => ({ ...prev, main_image: e.target.value }))}
              placeholder="메인 이미지 URL을 입력하세요"
            />
          </div>

          {/* 섹션별 내용 */}
          {Array.from({ length: 12 }, (_, i) => i + 1).map((sectionNum) => (
            <div key={sectionNum} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-md font-medium text-gray-900 mb-3">섹션 {sectionNum}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    내용
                  </label>
                  <textarea
                    value={formData[`s${sectionNum}_contents` as keyof typeof formData] as string}
                    onChange={(e) => setFormData(prev => ({ ...prev, [`s${sectionNum}_contents`]: e.target.value }))}
                    placeholder={`섹션 ${sectionNum} 내용을 입력하세요`}
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sabre ID
                  </label>
                  <HotelAutocomplete
                    value={formData[`s${sectionNum}_sabre_id` as keyof typeof formData] as string}
                    onChange={(value) => setFormData(prev => ({ ...prev, [`s${sectionNum}_sabre_id`]: value }))}
                    placeholder={`섹션 ${sectionNum} 호텔명 또는 Sabre ID 입력`}
                  />
                  {formData[`s${sectionNum}_sabre_id` as keyof typeof formData] && (
                    <div className="mt-1">
                      {(() => {
                        const sabreId = String(formData[`s${sectionNum}_sabre_id` as keyof typeof formData] || '').trim()
                        const hotel = hotelInfo[sabreId]
                        console.log(`섹션 ${sectionNum} 호텔 정보:`, {
                          sabreId,
                          hotel,
                          hotelInfo,
                          allKeys: Object.keys(hotelInfo)
                        })
                        return hotel ? (
                          <div className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                            ✓ {hotel.property_name_ko}
                          </div>
                        ) : (
                          <div className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
                            ✗ 호텔을 찾을 수 없습니다
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                blog ? '수정' : '생성'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}


