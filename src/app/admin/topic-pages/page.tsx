'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, Search, Edit, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { TopicPageWithHotels, TopicPageApiResponse } from '@/types/topic-page'

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
  const queryClient = useQueryClient()

  // 토픽 페이지 목록 조회
  const { data: response, isLoading } = useQuery({
    queryKey: ['topic-pages-list', statusFilter, searchInput],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchInput.trim()) params.set('search', searchInput.trim())

      const url = `/api/topic-pages/list?${params.toString()}`
      const res = await fetch(url)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '토픽 페이지 목록 조회 실패')
      }
      return res.json() as Promise<TopicPageApiResponse>
    },
  })

  const topicPages = (response?.data || []) as TopicPageWithHotels[]

  // 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/topic-pages?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '삭제 실패')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic-pages-list'] })
      alert('토픽 페이지가 삭제되었습니다.')
    },
    onError: (error: Error) => {
      alert(`삭제 실패: ${error.message}`)
    },
  })

  const handleDelete = (id: string, title: string) => {
    if (confirm(`"${title}" 토픽 페이지를 삭제하시겠습니까?\n연결된 호텔 정보도 함께 삭제됩니다.`)) {
      deleteMutation.mutate(id)
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
              호텔 토픽 페이지 관리
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              테마별 호텔 큐레이션 페이지를 관리합니다.
            </p>
          </div>
        </div>
        <Link
          href="/admin/topic-pages/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          새 토픽 페이지
        </Link>
      </div>

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
          <span>총 <strong className="text-gray-900">{topicPages.length}</strong>개 토픽 페이지</span>
        </div>
      </div>

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
                    {searchInput ? '검색 결과가 없습니다.' : '생성된 토픽 페이지가 없습니다.'}
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
                          href={`/admin/topic-pages/${page.id}`}
                          className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                          title="상세/편집"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(page.id, page.title_ko)}
                          disabled={deleteMutation.isPending}
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

