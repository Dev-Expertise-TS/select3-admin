'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { SignupForm } from '@/features/auth/components/SignupForm'
import { Shield } from 'lucide-react'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const { user, loading } = useAuth()
  const router = useRouter()

  // 랜덤 배경 이미지 선택 (항상 훅 순서 유지 위해 상단에 위치)
  const [bgUrl, setBgUrl] = useState<string | null>(null)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/login-images', { cache: 'no-store' })
        const json = await res.json()
        if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
          const idx = Math.floor(Math.random() * json.data.length)
          setBgUrl(`/login-image/${json.data[idx]}`)
        }
      } catch (e) {
        console.debug('배경 이미지 로드 실패:', e)
      }
    }
    load()
  }, [])

  // 이미 로그인된 사용자는 홈으로 리다이렉트
  useEffect(() => {
    console.log('🔐 로그인 페이지 - 인증 상태:', { loading, user: user?.email })
    if (!loading && user) {
      console.log('✅ 로그인된 사용자 감지, 홈으로 리다이렉트')
      router.replace('/')
    }
  }, [user, loading, router])

  // 로딩 중이거나 이미 로그인된 경우 로딩 표시
  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* 헤더 */}
      <div className="absolute top-0 left-0 right-0 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Tourvis Select
            </h1>
          </div>

        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex min-h-screen">
        {/* 왼쪽 패널 - 정보 및 특징 */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center text-white p-12 relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: bgUrl ? `url(${bgUrl})` : 'linear-gradient(135deg,#2563eb,#4f46e5)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.65)'
            }}
          />
          <div className="relative max-w-xl text-center">
            <h2 className="text-4xl font-extrabold mb-4">Tourvis Select 관리 시스템</h2>
            <p className="text-blue-100 text-3xl font-extrabold tracking-tight">목표 : 100박 예약 / 일</p>
          </div>
        </div>

        {/* 오른쪽 패널 - 로그인/회원가입 폼 */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* 탭 전환 버튼 */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-8">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all ${
                  isLogin
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                로그인
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all ${
                  !isLogin
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                사용자 신청
              </button>
            </div>

            {/* 폼 렌더링 */}
            {isLogin ? (
              <LoginForm 
                onSwitchToSignup={() => setIsLogin(false)}
                className="w-full"
              />
            ) : (
              <SignupForm 
                onSwitchToLogin={() => setIsLogin(true)}
                className="w-full"
              />
            )}

            {/* 추가 정보 */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                로그인함으로써 타이드스퀘어 투어비스 셀렉트 서비스 관리 약관 및 보안 관리에 동의합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
