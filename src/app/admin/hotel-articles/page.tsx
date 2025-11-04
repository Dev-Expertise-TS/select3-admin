'use client'

import React, { useState, useEffect } from 'react'
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
import { cn } from '@/lib/utils'
import { BlogSectionEditor } from './_components/BlogSectionEditor'

import 'react-quill-new/dist/quill.snow.css'

interface HotelBlog {
  id: string
  slug: string
  publish: boolean
  main_title: string
  sub_title: string
  main_image: string
  brand_id_connect: string | null // 브랜드 ID 쉼표 구분 문자열 (TEXT)
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
          // updated_at이 같으면 id 기준으로 문자열 비교 (UUID)
          return b.id.localeCompare(a.id)
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
  const handleDelete = async (blog: HotelBlog) => {
    if (!confirm('정말로 이 블로그를 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/hotel-articles/${blog.id}?slug=${encodeURIComponent(blog.slug)}`, {
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
  const handlePublishChange = async (blog: HotelBlog, publish: boolean) => {
    try {
      const response = await fetch(`/api/hotel-articles/${blog.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          slug: blog.slug,
          publish 
        })
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
                      onClick={() => handlePublishChange(blog, !blog.publish)}
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
                      onClick={() => handleDelete(blog)}
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

// 블로그 생성/편집 모달 컴포넌트
interface BlogModalProps {
  isOpen: boolean
  onClose: () => void
  blog?: HotelBlog | null
  onSave: () => void
}

function BlogModal({ isOpen, onClose, blog, onSave }: BlogModalProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [currentBlog, setCurrentBlog] = useState<HotelBlog | null>(blog || null)
  
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
    brand_id_connect: blog?.brand_id_connect || '',
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
  const [activeTab, setActiveTab] = useState('basic_info')
  
  // 브랜드 관련 상태
  const [brands, setBrands] = useState<Array<{ brand_id: number; brand_name_en: string; brand_name_ko: string | null }>>([])
  const [showBrandModal, setShowBrandModal] = useState(false)
  // TEXT 타입: 쉼표로 구분된 문자열을 배열로 변환
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>(() => {
    if (!blog?.brand_id_connect) return []
    return blog.brand_id_connect.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))
  })
  const [loadingBrands, setLoadingBrands] = useState(false)

  // 브랜드 목록 불러오기
  useEffect(() => {
    const loadBrands = async () => {
      setLoadingBrands(true)
      try {
        console.log('[브랜드 로딩] API 호출 시작...')
        const response = await fetch('/api/hotel-articles/brands')
        const result = await response.json()
        console.log('[브랜드 로딩] API 응답:', result)
        
        if (result.success) {
          console.log('[브랜드 로딩] 성공! 브랜드 개수:', result.data?.length || 0)
          setBrands(result.data || [])
        } else {
          console.error('[브랜드 로딩] 실패:', result.error)
        }
      } catch (err) {
        console.error('[브랜드 로딩] 오류:', err)
      } finally {
        setLoadingBrands(false)
      }
    }
    loadBrands()
  }, [])

  // 브랜드 선택 저장 (배열을 쉼표 구분 문자열로 변환)
  const handleSaveBrands = () => {
    const brandIdsString = selectedBrandIds.length > 0 ? selectedBrandIds.join(',') : ''
    console.log('[브랜드 선택] 저장할 brand_id_connect:', brandIdsString)
    setFormData({ ...formData, brand_id_connect: brandIdsString })
    setShowBrandModal(false)
  }

  // 대표 이미지 URL을 Storage로 업로드
  const handleUploadMainImage = async () => {
    if (!formData.main_image || !formData.main_image.startsWith('http')) {
      alert('유효한 이미지 URL을 입력해주세요.')
      return
    }

    setIsUploadingImage(true)
    try {
      const response = await fetch('/api/hotel-articles/upload-main-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl: formData.main_image,
          blogId: blog?.id
        })
      })

      const result = await response.json()

      if (result.success) {
        setFormData({ ...formData, main_image: result.data.url })
        alert('이미지가 성공적으로 업로드되었습니다.')
      } else {
        alert(result.error || '이미지 업로드에 실패했습니다.')
      }
    } catch (err) {
      console.error('이미지 업로드 오류:', err)
      alert('이미지 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const url = currentBlog ? `/api/hotel-articles/${currentBlog.id}` : '/api/hotel-articles'
      const method = currentBlog ? 'PUT' : 'POST'

      // datetime-local 형식을 ISO 형식으로 변환
      const submitData = {
        ...formData,
        updated_at: formData.updated_at ? new Date(formData.updated_at).toISOString() : undefined
      }

      console.log('[블로그 저장] 전송 데이터:', submitData)
      console.log('[블로그 저장] brand_id_connect (문자열):', submitData.brand_id_connect)

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      })

      const result = await response.json()
      console.log('[블로그 저장] 응답:', result)

      if (result.success) {
        console.log('[블로그 저장] 성공! 저장된 데이터:', result.data)
        console.log('[블로그 저장] 저장된 brand_id_connect:', result.data?.brand_id_connect)
        
        // POST 응답으로 받은 블로그 데이터로 currentBlog 업데이트
        if (result.data) {
          setCurrentBlog(result.data)
          
          // formData를 저장된 데이터로 완전히 동기화
          setFormData({
            ...formData,
            brand_id_connect: result.data.brand_id_connect || '',
            slug: result.data.slug,
            publish: result.data.publish,
            main_title: result.data.main_title,
            sub_title: result.data.sub_title,
            main_image: result.data.main_image,
            updated_at: result.data.updated_at ? formatDateTimeLocal(result.data.updated_at) : formData.updated_at
          })
          
          console.log('[블로그 저장] formData 동기화 완료. brand_id_connect:', result.data.brand_id_connect || '')
        }
        
        const message = currentBlog ? '블로그가 성공적으로 저장되었습니다.' : '블로그가 성공적으로 생성되었습니다.'
        setSuccessMessage(message)
        
        // 알림 표시
        alert(message)
        
        // 블로그 목록 새로고침
        onSave()
      } else {
        console.error('[블로그 저장] 실패:', result.error)
        setError(result.error || '저장에 실패했습니다.')
        alert('저장 실패: ' + (result.error || '알 수 없는 오류'))
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
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full h-[calc(100vh-2rem)] flex flex-col border-2 border-gray-300">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2">
              <Newspaper className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {currentBlog ? '블로그 수정' : '새 블로그 생성'}
              </h2>
              <p className="text-xs text-gray-600">
                {currentBlog ? '블로그 정보를 수정합니다' : '새로운 블로그를 생성합니다'}
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
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* 메시지 영역 */}
          <div className="px-6 pt-4 flex-shrink-0">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="text-red-600">⚠️</div>
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="text-green-600">✅</div>
                  <p className="text-green-800 text-sm">{successMessage}</p>
                </div>
              </div>
            )}
          </div>

          {/* 통합 탭 UI */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 탭 헤더 */}
            <div className="px-6 pb-2 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-medium text-gray-900">블로그 콘텐츠</h3>
                  <p className="text-xs text-gray-600">탭을 선택하여 기본 정보 또는 각 섹션의 콘텐츠를 편집하세요</p>
                </div>
                {currentBlog && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded">
                    💡 각 섹션마다 개별 저장할 수 있습니다
                  </span>
                )}
              </div>
            </div>

            {/* 탭 버튼들 */}
            <div className="px-6 flex-shrink-0 border-b border-gray-200">
              <div className="flex flex-wrap gap-1">
              {/* 기본 정보 탭 */}
              <button
                type="button"
                onClick={() => setActiveTab('basic_info')}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  activeTab === 'basic_info'
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                )}
              >
                기본 정보
              </button>

              {/* 섹션 탭들 */}
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
                const hasContent = formData[key as keyof typeof formData]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      "px-4 py-2 text-sm font-medium border-b-2 transition-colors relative",
                      activeTab === key
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    )}
                  >
                    {title}
                    {hasContent && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" title="콘텐츠 있음" />
                    )}
                  </button>
                )
              })}
              </div>
            </div>

            {/* 탭 콘텐츠 영역 */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* 기본 정보 탭 콘텐츠 - 스크롤 가능 */}
              <div className={cn(
                "overflow-y-auto px-6 py-4",
                activeTab === 'basic_info' ? 'flex-1' : 'hidden'
              )}>
                <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  브랜드 연결
                </label>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // 문자열을 배열로 변환
                      const ids = formData.brand_id_connect 
                        ? formData.brand_id_connect.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))
                        : []
                      setSelectedBrandIds(ids)
                      setShowBrandModal(true)
                    }}
                    className="cursor-pointer w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    브랜드 선택 ({formData.brand_id_connect ? formData.brand_id_connect.split(',').filter(s => s.trim()).length : 0}개)
                  </Button>
                  {/* 선택된 브랜드 태그 표시 */}
                  {formData.brand_id_connect && formData.brand_id_connect.trim() && (
                    <div className="flex flex-wrap gap-2">
                      {formData.brand_id_connect.split(',').map((idStr) => {
                        const brandId = parseInt(idStr.trim(), 10)
                        if (isNaN(brandId)) return null
                        const brand = brands.find(b => b.brand_id === brandId)
                        return brand ? (
                          <span 
                            key={brandId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
                          >
                            {brand.brand_name_en}
                            <button
                              type="button"
                              onClick={() => {
                                const ids = formData.brand_id_connect.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))
                                const newIds = ids.filter(id => id !== brandId)
                                setFormData({ ...formData, brand_id_connect: newIds.join(',') })
                              }}
                              className="ml-1 text-blue-600 hover:text-blue-800 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4">
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
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={formData.main_image}
                    onChange={(e) => setFormData({ ...formData, main_image: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUploadMainImage}
                    disabled={isUploadingImage || !formData.main_image}
                    className="cursor-pointer whitespace-nowrap"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        업로드 중...
                      </>
                    ) : (
                      'Storage로 업로드'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  외부 이미지 URL을 입력하고 "Storage로 업로드" 버튼을 클릭하면 Supabase Storage에 저장됩니다.
                </p>
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
              </div>

              {/* 섹션 탭 콘텐츠 - 스크롤 없음 (에디터 내부 스크롤만 사용) */}
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
                <div 
                  key={key} 
                  className={cn(
                    "flex-1 overflow-hidden px-6 py-4",
                    activeTab === key ? 'flex flex-col' : 'hidden'
                  )}
                >
                  <BlogSectionEditor
                    title={title}
                    contentKey={key}
                    sabreKey={sabreKey}
                    content={formData[key as keyof typeof formData] as string}
                    sabreId={formData[sabreKey as keyof typeof formData] as string}
                    blogId={currentBlog?.id}
                    blogSlug={currentBlog?.slug || formData.slug}
                    onContentChange={(k, v) => setFormData({ ...formData, [k]: v })}
                    onSabreChange={(k, v) => setFormData({ ...formData, [k]: v })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
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

        {/* 브랜드 선택 모달 */}
        {showBrandModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setShowBrandModal(false)}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">브랜드 선택</h3>
                <p className="text-sm text-gray-600 mt-1">연결할 브랜드를 선택하세요 (복수 선택 가능)</p>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {loadingBrands ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">브랜드 목록을 불러오는 중...</span>
                  </div>
                ) : brands.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    <p>등록된 브랜드가 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {brands.map((brand) => (
                      <label
                        key={brand.brand_id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBrandIds.includes(brand.brand_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBrandIds([...selectedBrandIds, brand.brand_id])
                            } else {
                              setSelectedBrandIds(selectedBrandIds.filter(id => id !== brand.brand_id))
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{brand.brand_name_en}</div>
                          {brand.brand_name_ko && (
                            <div className="text-sm text-gray-500">{brand.brand_name_ko}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedBrandIds(formData.brand_id_connect || [])
                    setShowBrandModal(false)
                  }}
                  className="cursor-pointer"
                >
                  취소
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveBrands}
                  className="cursor-pointer bg-blue-600 hover:bg-blue-700"
                >
                  선택 완료 ({selectedBrandIds.length}개)
                </Button>
              </div>
            </div>
          </div>
        )}
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
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full h-[calc(100vh-2rem)] flex flex-col border-2 border-gray-300">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2">
              <Newspaper className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">블로그 보기</h2>
              <p className="text-xs text-gray-600">블로그 내용을 확인합니다</p>
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
        <div className="flex-1 overflow-y-auto p-6">
          <style jsx global>{`
            .blog-view-content ul {
              list-style-type: disc !important;
              margin-left: 1.5em !important;
              margin-bottom: 1.2em !important;
            }
            .blog-view-content ol {
              list-style-type: decimal !important;
              margin-left: 1.5em !important;
              margin-bottom: 1.2em !important;
            }
            .blog-view-content li {
              margin-bottom: 0.4em !important;
              line-height: 1.8 !important;
            }
            .blog-view-content p {
              margin-bottom: 1.2em !important;
              line-height: 1.8 !important;
            }
            .blog-view-content h1,
            .blog-view-content h2,
            .blog-view-content h3,
            .blog-view-content h4,
            .blog-view-content h5,
            .blog-view-content h6 {
              margin-top: 1.5em !important;
              margin-bottom: 0.8em !important;
              line-height: 1.6 !important;
            }
            .blog-view-content blockquote {
              margin: 1.5em 0 !important;
              padding: 0.8em 1.2em !important;
              border-left: 4px solid #e5e7eb !important;
              background-color: #f9fafb !important;
              line-height: 1.7 !important;
            }
          `}</style>
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
                    className="prose prose-sm max-w-none text-gray-600 blog-view-content"
                    style={{
                      lineHeight: '1.8',
                      fontSize: '14px'
                    }}
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            닫기
          </Button>
        </div>
      </div>
    </div>
  )
}