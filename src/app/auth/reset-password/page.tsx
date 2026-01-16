'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Shield, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, isInitialized, refreshUser } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // 비밀번호 재설정 링크를 통한 세션 확인
  useEffect(() => {
    const verifyResetLink = async () => {
      const code = searchParams?.get('code')
      const tokenHash = searchParams?.get('token_hash')
      const type = searchParams?.get('type')
      const verified = searchParams?.get('verified')

      console.log('🔐 비밀번호 재설정 페이지 로드:', { 
        hasCode: !!code, 
        code: code?.substring(0, 10) + '...',
        hasTokenHash: !!tokenHash,
        tokenHash: tokenHash?.substring(0, 10) + '...',
        type,
        verified,
        allParams: Object.fromEntries(searchParams?.entries() || [])
      })

      // code 또는 token_hash가 있고 verified가 없으면 서버 API로 검증 요청
      if ((code || tokenHash) && !verified) {
        console.log('🔐 서버 API로 코드/토큰 검증 요청...')
        try {
          // 서버 API로 검증 (서버에서 세션 생성)
          let verifyUrl = '/api/auth/reset-password/verify?'
          if (tokenHash) {
            verifyUrl += `token_hash=${encodeURIComponent(tokenHash)}&type=${type || 'recovery'}`
          } else if (code) {
            verifyUrl += `code=${encodeURIComponent(code)}`
            if (type) {
              verifyUrl += `&type=${encodeURIComponent(type)}`
            }
          }
          window.location.href = verifyUrl
          return // 리다이렉트되므로 여기서 종료
        } catch (error) {
          console.error('❌ 코드 검증 요청 오류:', error)
          setError('비밀번호 재설정 링크 처리 중 오류가 발생했습니다.')
          setVerifying(false)
          return
        }
      }

      // verified가 있거나 code가 없으면 세션 확인
      try {
        console.log('🔐 세션 확인 시작...')
        const supabase = createClient()
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('❌ 세션 확인 오류:', sessionError)
          setError('비밀번호 재설정 링크 처리 중 오류가 발생했습니다.')
          setVerifying(false)
          return
        }

        if (!session) {
          console.log('❌ 세션이 없습니다')
          
          if (!code && !verified) {
            // code도 없고 verified도 없으면 잘못된 접근
            setError('비밀번호 재설정 링크가 올바르지 않습니다. 이메일에서 링크를 다시 확인해주세요.')
          } else {
            setError('비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다. 다시 요청해주세요.')
          }
          setVerifying(false)
          return
        }

        console.log('✅ 세션 확인 완료:', { 
          userId: session.user?.id, 
          email: session.user?.email,
          hasSession: !!session
        })
        
        // 사용자 정보 새로고침
        if (refreshUser) {
          await refreshUser()
        }
        
        setVerifying(false)
      } catch (error) {
        console.error('❌ 세션 확인 중 예외 발생:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        setError(`비밀번호 재설정 링크 처리 중 오류가 발생했습니다: ${errorMessage}`)
        setVerifying(false)
      }
    }

    // 인증이 초기화된 후에만 세션 확인 시도
    if (isInitialized && !authLoading) {
      verifyResetLink()
    }
  }, [searchParams, isInitialized, authLoading, refreshUser])

  // 이미 로그인된 사용자는 홈으로 리다이렉트 (코드 교환 후)
  useEffect(() => {
    if (isInitialized && !authLoading && !verifying && user) {
      // 코드 교환이 완료되고 사용자가 있으면 계속 진행 (비밀번호 변경 가능)
    }
  }, [user, authLoading, isInitialized, verifying, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const trimmedPassword = password.trim()
    const trimmedConfirmPassword = confirmPassword.trim()

    if (!trimmedPassword || !trimmedConfirmPassword) {
      setError('모든 필드를 입력해주세요.')
      return
    }

    if (trimmedPassword.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setError('비밀번호와 확인 비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmedPassword })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        setPassword('')
        setConfirmPassword('')
        
        // 3초 후 로그인 페이지로 리다이렉트
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setError(result.error || '비밀번호 재설정에 실패했습니다.')
      }
    } catch (error) {
      console.error('비밀번호 재설정 오류:', error)
      setError('비밀번호 재설정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 로딩 중이거나 코드 검증 중인 경우 로딩 표시
  if (authLoading || !isInitialized || verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {verifying ? '재설정 링크 확인 중...' : '페이지 로딩 중...'}
          </p>
        </div>
      </div>
    )
  }

  // 에러가 있고 코드가 없는 경우에만 에러 페이지 표시
  if (error && !searchParams?.get('code') && !user && !verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 text-center">
            <div className="text-red-600 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">유효하지 않은 링크</h2>
            <p className="text-sm text-gray-600 mb-4">
              {error}
            </p>
            <Button
              onClick={() => router.push('/login')}
              className="w-full"
            >
              로그인으로 돌아가기
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Tourvis Select
            </h1>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">비밀번호 재설정</h2>
          <p className="text-sm text-gray-600">
            새로운 비밀번호를 입력해주세요
          </p>
        </div>

        {/* 폼 */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 성공 메시지 */}
            {success && (
              <div className="rounded-md bg-green-50 p-4 border border-green-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      비밀번호가 성공적으로 변경되었습니다.
                    </p>
                    <p className="mt-1 text-xs text-green-700">
                      잠시 후 로그인 페이지로 이동합니다.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 에러 메시지 */}
            {error && !success && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {!success && (
              <>
                {/* 새 비밀번호 */}
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                    새 비밀번호
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="새 비밀번호를 입력하세요 (최소 6자)"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    비밀번호는 최소 6자 이상이어야 합니다.
                  </p>
                </div>

                {/* 비밀번호 확인 */}
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호 확인
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="비밀번호를 다시 입력하세요"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      disabled={loading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10"
                >
                  {loading ? '변경 중...' : '비밀번호 변경'}
                </Button>
              </>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                로그인으로 돌아가기
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
