'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { SignupForm } from '@/features/auth/components/SignupForm'
import { Shield } from 'lucide-react'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const { user, loading, isInitialized } = useAuth()
  const router = useRouter()

  // 랜덤 배경 이미지 선택 (항상 훅 순서 유지 위해 상단에 위치)
  const [bgUrl, setBgUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setImageLoading(true)
        setImageError(false)
        
        // 캐시된 이미지 목록을 먼저 시도
        const cachedImages = localStorage.getItem('loginImages')
        if (cachedImages) {
          try {
            const images = JSON.parse(cachedImages)
            if (Array.isArray(images) && images.length > 0) {
              const idx = Math.floor(Math.random() * images.length)
              setBgUrl(`/login-image/${images[idx]}`)
              setImageLoading(false)
              return
            }
                  } catch {
          // 캐시 파싱 실패 시 무시
        }
        }

        // API에서 이미지 목록 가져오기
        const res = await fetch('/api/login-images', { 
          cache: 'force-cache',
          headers: {
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
          }
        })
        const json = await res.json()
        
        if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
          // 이미지 목록을 캐시에 저장
          localStorage.setItem('loginImages', JSON.stringify(json.data))
          
          const idx = Math.floor(Math.random() * json.data.length)
          setBgUrl(`/login-image/${json.data[idx]}`)
        }
              } catch {
          console.debug('배경 이미지 로드 실패')
          setImageError(true)
        } finally {
        setImageLoading(false)
      }
    }
    load()
  }, [])

  // 이미 로그인된 사용자는 홈으로 리다이렉트
  useEffect(() => {
    console.log('🔐 로그인 페이지 - 인증 상태 확인:', { 
      loading, 
      isInitialized,
      user: user?.email,
      pathname: window.location.pathname
    })
    
    // 인증이 초기화되고 로딩이 완료된 후에만 처리
    if (isInitialized && !loading) {
      if (user) {
        console.log('✅ 이미 로그인된 사용자 감지, 홈으로 리다이렉트')
        router.replace('/')
      } else {
        console.log('❌ 로그인되지 않은 사용자, 로그인 페이지 유지')
      }
    }
  }, [user, loading, isInitialized, router])

  // 로딩 중이거나 이미 로그인된 경우 로딩 표시
  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {!isInitialized ? '시스템 초기화 중...' : '인증 상태 확인 중...'}
          </p>
        </div>
      </div>
    )
  }

  // 이미 로그인된 사용자는 로딩 표시 (리다이렉트 중)
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">홈으로 이동 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* 헤더 */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white drop-shadow-lg">
              Tourvis Select
            </h1>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex min-h-screen">
        {/* 왼쪽 패널 - 정보 및 특징 */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center text-white p-12 relative overflow-hidden">
          {/* 배경 이미지 */}
          {bgUrl && !imageError && (
            <div className="absolute inset-0">
              <Image
                src={bgUrl}
                alt="Tourvis Select 배경 이미지"
                fill
                priority
                quality={85}
                sizes="(max-width: 1024px) 0vw, 50vw"
                className="object-cover"
                onLoad={() => setImageLoading(false)}
                onError={() => setImageError(true)}
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
              />
              {/* 이미지 오버레이 */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-blue-800/60 to-indigo-900/70" />
            </div>
          )}

          {/* 이미지 로딩 중 스켈레톤 */}
          {imageLoading && (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 animate-pulse" />
          )}

          {/* 이미지 로드 실패 시 대체 배경 */}
          {imageError && (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600" />
          )}

          {/* 콘텐츠 */}
          <div className="relative max-w-xl text-center z-10">
            <h2 className="text-4xl font-extrabold mb-4 drop-shadow-lg">
              Tourvis Select 관리 시스템
            </h2>
            <p className="text-blue-100 text-3xl font-extrabold tracking-tight drop-shadow-lg">
              목표 : 100박 예약 / 일
            </p>
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
