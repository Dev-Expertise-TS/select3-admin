'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { 
  Newspaper, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2,
  Calendar,
  Eye
} from 'lucide-react'
import { AuthGuard } from '@/components/shared/auth-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HotelAutocomplete } from '@/components/shared/hotel-autocomplete'
import { cn } from '@/lib/utils'

// Quill Editor 동적 import (client-side only) - React 19 호환 버전
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-50 rounded border flex items-center justify-center text-gray-500">에디터 로딩 중...</div>
})

import 'react-quill-new/dist/quill.snow.css'

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
    <AuthGuard>
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
  const [showViewModal, setShowViewModal] = useState(false)
  const [editingBlog, setEditingBlog] = useState<HotelBlog | null>(null)
  const [viewingBlog, setViewingBlog] = useState<HotelBlog | null>(null)

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

  // 페이지 변경 시 블로그 목록 다시 로드
  useEffect(() => {
    loadBlogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, publishFilter])

  // 검색 및 필터 핸들러
  const _handleSearch = () => {
    setCurrentPage(1) // 검색 시 첫 페이지로 이동
    loadBlogs()
  }

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
      } else {
        alert(result.error || '블로그 삭제에 실패했습니다.')
      }
    } catch (err) {
      console.error('블로그 삭제 오류:', err)
      alert('블로그 삭제 중 오류가 발생했습니다.')
    }
  }

  // 발행 상태 변경
  const handlePublishChange = async (id: number, publish: boolean) => {
    try {
      const response = await fetch(`/api/hotel-articles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ publish })
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
    return publish 
      ? "bg-green-100 text-green-800" 
      : "bg-yellow-100 text-yellow-800"
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
          <Button onClick={() => setShowCreateModal(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            새 블로그
          </Button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="text-red-600">⚠️</div>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* 블로그 목록 */}
      <div className="bg-white rounded-lg border overflow-hidden">
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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
                        최종 수정: {new Date(blog.updated_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
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
                        setViewingBlog(blog)
                        setShowViewModal(true)
                      }}
                      className="text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingBlog(blog)
                        setShowEditModal(true)
                      }}
                      className="cursor-pointer"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <button
                      onClick={() => handlePublishChange(blog.id, !blog.publish)}
                      className={cn(
                        "text-xs px-2 py-1 border rounded cursor-pointer",
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
                      className="text-red-600 hover:text-red-700 cursor-pointer"
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
                  className="px-2 cursor-pointer"
                >
                  «
                </Button>
                
                {/* 이전 페이지 */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="cursor-pointer"
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
                          className="px-3 cursor-pointer"
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
                          className="px-3 cursor-pointer"
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
                          className="px-3 cursor-pointer"
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
                  className="cursor-pointer"
                >
                  다음
                </Button>
                
                {/* 마지막 페이지로 */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 cursor-pointer"
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
          }}
        />
      )}

      {/* 블로그 보기 모달 */}
      {showViewModal && (
        <BlogViewModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false)
            setViewingBlog(null)
          }}
          blog={viewingBlog}
        />
      )}
    </div>
  )
}

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'indent',
  'align',
  'link', 'image',
  'blockquote', 'code-block'
]

// 섹션 에디터 컴포넌트
interface SectionEditorProps {
  title: string
  contentKey: string
  sabreKey: string
  content: string
  sabreId: string
  blogId?: number
  onContentChange: (key: string, value: string) => void
  onSabreChange: (key: string, value: string) => void
}

function SectionEditor({ title, contentKey, sabreKey, content, sabreId, blogId, onContentChange, onSabreChange }: SectionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(!!content)
  const [editorHeight, setEditorHeight] = useState<'small' | 'medium' | 'large'>('medium')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [hotelInfo, setHotelInfo] = useState<{ property_name_ko: string; property_name_en: string } | null>(null)
  const [loadingHotelInfo, setLoadingHotelInfo] = useState(false)
  const [editorContent, setEditorContent] = useState(content)
  const quillRef = useRef<any>(null)

  // 에디터 높이 설정
  const heightMap = {
    small: '390px',
    medium: '585px',
    large: '780px'
  }

  // 이미지 업로드 핸들러
  const handleImageUpload = () => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      const formData = new FormData()
      formData.append('file', file)
      if (sabreId) {
        formData.append('sabreId', sabreId)
      }

      try {
        const response = await fetch('/api/hotel/content/upload-image', {
          method: 'POST',
          body: formData
        })

        const result = await response.json()

        if (result.success) {
          const quill = quillRef.current?.getEditor?.()
          if (quill) {
            const range = quill.getSelection(true) || { index: quill.getLength() }
            quill.insertEmbed(range.index, 'image', result.data.url)
            quill.setSelection(range.index + 1)
          }
        } else {
          alert(result.error || '이미지 업로드에 실패했습니다.')
        }
      } catch (err) {
        console.error('이미지 업로드 오류:', err)
        alert('이미지 업로드 중 오류가 발생했습니다.')
      }
    }

    input.click()
  }

  // Quill 에디터 모듈 설정 (이미지 핸들러 포함)
  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['blockquote', 'code-block'],
        ['clean']
      ],
      handlers: {
        image: handleImageUpload
      }
    }
  }), [sabreId])

  // content prop이 변경될 때만 에디터 내용 업데이트
  useEffect(() => {
    setEditorContent(content)
  }, [content])

  // cleanup: 컴포넌트 언마운트 시 debounce 타이머 정리
  useEffect(() => {
    return () => {
      if (handleEditorChange.current) {
        clearTimeout(handleEditorChange.current)
      }
    }
  }, [])

  // 호텔 정보 가져오기
  useEffect(() => {
    const fetchHotelInfo = async () => {
      if (!sabreId) {
        setHotelInfo(null)
        return
      }

      setLoadingHotelInfo(true)
      try {
        const response = await fetch(`/api/hotel/get?sabre_id=${sabreId}`)
        const result = await response.json()
        
        if (result.success && result.data) {
          setHotelInfo({
            property_name_ko: result.data.property_name_ko,
            property_name_en: result.data.property_name_en
          })
        } else {
          setHotelInfo(null)
        }
      } catch (err) {
        console.error('호텔 정보 로드 오류:', err)
        setHotelInfo(null)
      } finally {
        setLoadingHotelInfo(false)
      }
    }

    fetchHotelInfo()
  }, [sabreId])

  // 에디터 내용이 변경될 때 (debounce 적용)
  const handleEditorChange = useRef<NodeJS.Timeout>()
  const onEditorChange = (htmlContent: string) => {
    setEditorContent(htmlContent)
    setSaveSuccess(false)
    
    // debounce로 부모 상태 업데이트
    if (handleEditorChange.current) {
      clearTimeout(handleEditorChange.current)
    }
    handleEditorChange.current = setTimeout(() => {
      onContentChange(contentKey, htmlContent)
    }, 500)
  }

  // 섹션별 저장
  const handleSectionSave = async () => {
    if (!blogId) {
      alert('블로그를 먼저 생성해주세요.')
      return
    }

    setIsSaving(true)
    try {
      // 현재 에디터 내용 먼저 부모에게 전달
      onContentChange(contentKey, editorContent)
      
      const response = await fetch(`/api/hotel-articles/${blogId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          [contentKey]: editorContent,
          [sabreKey]: sabreId || null
        })
      })

      const result = await response.json()

      if (result.success) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000) // 3초 후 성공 표시 제거
      } else {
        alert(result.error || '저장에 실패했습니다.')
      }
    } catch (err) {
      console.error('섹션 저장 오류:', err)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div 
        className="flex items-center justify-between p-3 bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-medium text-gray-700">{title}</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="cursor-pointer text-xs"
          >
            {isExpanded ? '접기' : '편집하기'}
          </Button>
          {content && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
              작성됨
            </span>
          )}
          {saveSuccess && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded animate-pulse">
              ✓ 저장됨
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            {sabreId && hotelInfo ? (
              <div className="text-sm">
                <span className="font-medium text-gray-700">Sabre ID: {sabreId}</span>
                <span className="text-gray-500 mx-2">•</span>
                <span className="text-gray-700">{hotelInfo.property_name_ko}</span>
                <span className="text-gray-500 mx-2">•</span>
                <span className="text-gray-500">{hotelInfo.property_name_en}</span>
              </div>
            ) : sabreId && loadingHotelInfo ? (
              <div className="text-sm text-gray-500">호텔 정보 로딩 중...</div>
            ) : sabreId ? (
              <div className="text-sm text-gray-500">Sabre ID: {sabreId}</div>
            ) : (
              <div className="text-sm text-gray-400">호텔 미연결</div>
            )}
            <div className="w-64">
              <HotelAutocomplete
                value={sabreId}
                onChange={(value) => {
                  onSabreChange(sabreKey, value)
                  setSaveSuccess(false) // 호텔 변경 시 저장 상태 초기화
                }}
                placeholder="호텔 검색..."
              />
            </div>
          </div>
          {isExpanded && (
            <>
              <div className="flex items-center gap-1 border rounded px-2 py-1 bg-white">
                <button
                  type="button"
                  onClick={() => setEditorHeight('small')}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded",
                    editorHeight === 'small' ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                  )}
                  title="작게"
                >
                  S
                </button>
                <button
                  type="button"
                  onClick={() => setEditorHeight('medium')}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded",
                    editorHeight === 'medium' ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                  )}
                  title="보통"
                >
                  M
                </button>
                <button
                  type="button"
                  onClick={() => setEditorHeight('large')}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded",
                    editorHeight === 'large' ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                  )}
                  title="크게"
                >
                  L
                </button>
              </div>
              {blogId && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSectionSave}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      저장중
                    </>
                  ) : (
                    '저장'
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 bg-white flex justify-center">
          <div className="w-full max-w-4xl">
            <ReactQuill
              {...({ ref: quillRef } as any)}
              key={`editor-${contentKey}`}
              theme="snow"
              value={editorContent || ''}
              onChange={onEditorChange}
              modules={quillModules}
              formats={quillFormats}
              className="bg-white"
              style={{ height: heightMap[editorHeight], marginBottom: '42px' }}
            />
          </div>
        </div>
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
  // 날짜를 datetime-local 형식으로 변환하는 함수
  const formatDateTimeLocal = (dateString: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    } catch {
      return ''
    }
  }

  const [formData, setFormData] = useState({
    slug: blog?.slug || '',
    publish: blog?.publish || false,
    main_title: blog?.main_title || '',
    sub_title: blog?.sub_title || '',
    main_image: blog?.main_image || '',
    updated_at: blog?.updated_at ? formatDateTimeLocal(blog.updated_at) : '',
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const url = blog ? `/api/hotel-articles/${blog.id}` : '/api/hotel-articles'
      const method = blog ? 'PUT' : 'POST'

      // datetime-local 형식을 ISO 형식으로 변환
      const submitData = {
        ...formData,
        updated_at: formData.updated_at ? new Date(formData.updated_at).toISOString() : undefined
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      })

      const result = await response.json()

      if (result.success) {
        const message = blog ? '블로그가 성공적으로 저장되었습니다.' : '블로그가 성공적으로 생성되었습니다.'
        setSuccessMessage(message)
        
        // 알림 표시
        alert(message)
        
        // 블로그 목록 새로고침
        onSave()
        
        // 모달 닫기
        setTimeout(() => {
          onClose()
        }, 500)
      } else {
        setError(result.error || '저장에 실패했습니다.')
      }
    } catch (err) {
      console.error('저장 오류:', err)
      setError('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden border-2 border-gray-300">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2">
              <Newspaper className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {blog ? '블로그 수정' : '새 블로그 생성'}
              </h2>
              <p className="text-sm text-gray-600">
                {blog ? '블로그 정보를 수정합니다' : '새로운 블로그를 생성합니다'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            ✕
          </Button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="text-red-600">⚠️</div>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="text-green-600">✅</div>
                <p className="text-green-800">{successMessage}</p>
              </div>
            </div>
          )}

          {/* 기본 정보 */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">기본 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug *
                </label>
                <Input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="블로그 URL 슬러그"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  업데이트 날짜
                </label>
                <div className="flex gap-2">
                  <Input
                    type="datetime-local"
                    value={formData.updated_at}
                    onChange={(e) => setFormData({ ...formData, updated_at: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      const formatted = formatDateTimeLocal(now.toISOString())
                      setFormData({ ...formData, updated_at: formatted })
                    }}
                    className="cursor-pointer whitespace-nowrap"
                  >
                    현재
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.publish}
                  onChange={(e) => setFormData({ ...formData, publish: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">발행</span>
              </label>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목 *
              </label>
              <Input
                type="text"
                value={formData.main_title}
                onChange={(e) => setFormData({ ...formData, main_title: e.target.value })}
                placeholder="블로그 제목"
                required
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                부제목
              </label>
              <Input
                type="text"
                value={formData.sub_title}
                onChange={(e) => setFormData({ ...formData, sub_title: e.target.value })}
                placeholder="블로그 부제목"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                대표 이미지
              </label>
              <div className="space-y-3">
                <Input
                  type="url"
                  value={formData.main_image}
                  onChange={(e) => setFormData({ ...formData, main_image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
                {formData.main_image && (
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <p className="text-xs text-gray-600 mb-2">미리보기</p>
                    <div className="relative w-full max-w-md mx-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.main_image}
                        alt="대표 이미지 미리보기"
                        className="w-full h-auto rounded-lg border border-gray-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const errorDiv = target.nextElementSibling as HTMLElement
                          if (errorDiv) errorDiv.style.display = 'flex'
                        }}
                        onLoad={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'block'
                          const errorDiv = target.nextElementSibling as HTMLElement
                          if (errorDiv) errorDiv.style.display = 'none'
                        }}
                      />
                      <div 
                        className="w-full h-40 bg-gray-100 rounded-lg border border-gray-300 flex-col items-center justify-center text-gray-400 text-sm"
                        style={{ display: 'none' }}
                      >
                        <Newspaper className="h-8 w-8 mb-2" />
                        <p>이미지를 불러올 수 없습니다</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 섹션별 내용 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">섹션별 내용</h3>
                <p className="text-sm text-gray-600">각 섹션을 클릭하여 펼치고 HTML 콘텐츠를 편집하세요</p>
              </div>
              {blog && (
                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded">
                  💡 각 섹션마다 개별 저장할 수 있습니다
                </span>
              )}
            </div>
            {[
              { key: 's1_contents', sabreKey: 's1_sabre_id', title: '섹션 1' },
              { key: 's2_contents', sabreKey: 's2_sabre_id', title: '섹션 2' },
              { key: 's3_contents', sabreKey: 's3_sabre_id', title: '섹션 3' },
              { key: 's4_contents', sabreKey: 's4_sabre_id', title: '섹션 4' },
              { key: 's5_contents', sabreKey: 's5_sabre_id', title: '섹션 5' },
              { key: 's6_contents', sabreKey: 's6_sabre_id', title: '섹션 6' },
              { key: 's7_contents', sabreKey: 's7_sabre_id', title: '섹션 7' },
              { key: 's8_contents', sabreKey: 's8_sabre_id', title: '섹션 8' },
              { key: 's9_contents', sabreKey: 's9_sabre_id', title: '섹션 9' },
              { key: 's10_contents', sabreKey: 's10_sabre_id', title: '섹션 10' },
              { key: 's11_contents', sabreKey: 's11_sabre_id', title: '섹션 11' },
              { key: 's12_contents', sabreKey: 's12_sabre_id', title: '섹션 12' }
            ].map(({ key, sabreKey, title }) => (
              <SectionEditor
                key={key}
                title={title}
                contentKey={key}
                sabreKey={sabreKey}
                content={formData[key as keyof typeof formData] as string}
                sabreId={formData[sabreKey as keyof typeof formData] as string}
                blogId={blog?.id}
                onContentChange={(k, v) => setFormData({ ...formData, [k]: v })}
                onSabreChange={(k, v) => setFormData({ ...formData, [k]: v })}
              />
            ))}
          </div>

          {/* 버튼 */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="cursor-pointer"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 블로그 보기 모달 컴포넌트
interface BlogViewModalProps {
  isOpen: boolean
  onClose: () => void
  blog: HotelBlog | null
}

function BlogViewModal({ isOpen, onClose, blog }: BlogViewModalProps) {
  if (!isOpen || !blog) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border-2 border-gray-300">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2">
              <Newspaper className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">블로그 보기</h2>
              <p className="text-sm text-gray-600">블로그 내용을 확인합니다</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            ✕
          </Button>
        </div>

        {/* 내용 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* 기본 정보 */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-medium text-gray-900">{blog.main_title}</h3>
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                blog.publish 
                  ? "bg-green-100 text-green-800" 
                  : "bg-yellow-100 text-yellow-800"
              )}>
                {blog.publish ? '발행됨' : '초안'}
              </span>
            </div>
            
            {blog.sub_title && (
              <p className="text-gray-600 mb-4">{blog.sub_title}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                생성일: {new Date(blog.created_at).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                수정일: {new Date(blog.updated_at).toLocaleDateString()}
              </div>
              <div className="text-gray-600">
                Slug: {blog.slug}
              </div>
            </div>

            {/* 대표 이미지 */}
            {blog.main_image && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">대표 이미지</h4>
                <div className="max-w-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={blog.main_image}
                    alt={blog.main_title}
                    className="w-full h-48 object-cover rounded-lg border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 섹션별 내용 */}
          <div className="space-y-6">
            {[
              { key: 's1_contents', title: '섹션 1' },
              { key: 's2_contents', title: '섹션 2' },
              { key: 's3_contents', title: '섹션 3' },
              { key: 's4_contents', title: '섹션 4' },
              { key: 's5_contents', title: '섹션 5' },
              { key: 's6_contents', title: '섹션 6' },
              { key: 's7_contents', title: '섹션 7' },
              { key: 's8_contents', title: '섹션 8' },
              { key: 's9_contents', title: '섹션 9' },
              { key: 's10_contents', title: '섹션 10' },
              { key: 's11_contents', title: '섹션 11' },
              { key: 's12_contents', title: '섹션 12' }
            ].map(({ key, title }) => {
              const content = blog[key as keyof HotelBlog] as string
              const sabreIdKey = key.replace('_contents', '_sabre_id') as keyof HotelBlog
              const sabreId = blog[sabreIdKey] as string
              
              if (!content || content.trim() === '') return null

              return (
                <div key={key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700">{title}</h4>
                    {sabreId && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        호텔 ID: {sabreId}
                      </span>
                    )}
                  </div>
                  <div 
                    className="prose prose-sm max-w-none text-gray-600"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                </div>
              )
            })}
          </div>

          {/* 내용이 없는 경우 */}
          {!blog.s1_contents && !blog.s2_contents && !blog.s3_contents && 
           !blog.s4_contents && !blog.s5_contents && !blog.s6_contents &&
           !blog.s7_contents && !blog.s8_contents && !blog.s9_contents &&
           !blog.s10_contents && !blog.s11_contents && !blog.s12_contents && (
            <div className="text-center py-8 text-gray-500">
              <Newspaper className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>아직 작성된 내용이 없습니다.</p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            닫기
          </Button>
        </div>
      </div>
    </div>
  )
}