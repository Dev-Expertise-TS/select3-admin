'use client'

import { Star } from 'lucide-react'
import { SatisfactionSurveyTable } from './_components/SatisfactionSurveyTable'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SatisfactionSurveyPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('🔐 인증 상태 확인:', { user, loading })
    
    if (!loading && !user) {
      console.log('❌ 인증되지 않은 사용자 - 로그인 페이지로 리다이렉트')
      router.push('/login')
      return
    }
    
    if (!loading && user && user.role !== 'admin') {
      console.log('❌ 관리자 권한 없음 - 홈으로 리다이렉트')
      router.push('/')
      return
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-sm text-gray-600">로그인이 필요합니다.</p>
        </div>
      </div>
    )
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-sm text-gray-600">관리자 권한이 필요합니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-yellow-600 p-2">
          <Star className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">고객 만족도 데이터 관리</h1>
          <p className="text-sm text-gray-600 mt-1">고객 만족도 설문 결과 데이터를 조회하고 관리합니다.</p>
        </div>
      </div>

      <SatisfactionSurveyTable />
    </div>
  )
}

