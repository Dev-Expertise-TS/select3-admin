'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FileText, Save, ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { TopicPageWithHotels } from '@/types/topic-page'
import { getTopicPage } from '@/features/recommendation-pages/actions'
import { TopicPageForm } from './_components/TopicPageForm'
import { TopicPageHotelsManager } from './_components/TopicPageHotelsManager'

export default function TopicPageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const pageId = params.id as string
  const isNew = pageId === 'new'
  const [topicPage, setTopicPage] = useState<TopicPageWithHotels | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(!isNew)

  // 토픽 페이지 조회
  useEffect(() => {
    if (isNew) return

    const loadTopicPage = async () => {
      setIsLoading(true)
      try {
        const result = await getTopicPage(pageId, undefined)
        if (result.success && result.data) {
          setTopicPage(result.data as TopicPageWithHotels)
        }
      } catch (err) {
        console.error('토픽 페이지 로드 오류:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadTopicPage()
  }, [pageId, isNew])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/recommendation-pages"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="rounded-lg bg-blue-600 p-2">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {isNew ? '새 추천 페이지' : topicPage?.title_ko || '추천 페이지 편집'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {isNew ? '새로운 추천 페이지를 생성합니다.' : '추천 페이지 정보를 수정합니다.'}
            </p>
          </div>
        </div>
      </div>

      {/* 폼 */}
      <TopicPageForm topicPage={topicPage} isNew={isNew} />

      {/* 호텔 관리 (기존 페이지만) */}
      {!isNew && topicPage && (
        <TopicPageHotelsManager pageId={pageId} hotels={topicPage.hotels || []} />
      )}
    </div>
  )
}

