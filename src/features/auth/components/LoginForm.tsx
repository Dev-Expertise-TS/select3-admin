'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface LoginFormProps {
  onSwitchToSignup?: () => void
  className?: string
}

export function LoginForm({ onSwitchToSignup, className }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // ✅ 이메일과 패스워드 앞뒤 공백 제거
      const trimmedEmail = email.trim()
      const trimmedPassword = password.trim()
      
      console.log('🔐 로그인 시도:', { 
        email: trimmedEmail, 
        passwordLength: trimmedPassword.length,
        hadEmailSpaces: email !== trimmedEmail,
        hadPasswordSpaces: password !== trimmedPassword
      })
      
      const result = await login(trimmedEmail, trimmedPassword)
      
      if (result.success) {
        // 로그인 성공 - 페이지 리다이렉트는 AuthContext에서 처리
        console.log('로그인 성공')

        // Chrome Credential Management API로 자격 증명 저장 시도 (주소/비밀번호 관리에 노출)
        try {
          const navAny = navigator as unknown as {
            credentials?: {
              create?: (data: unknown) => Promise<unknown>
              store?: (cred: unknown) => Promise<unknown>
            }
          }
          if (typeof window !== 'undefined' && navAny.credentials) {
            let cred: unknown | null = null
            try {
              // 표준 create API 시도
              cred = await navAny.credentials.create?.({
                password: { id: email, password },
              } as unknown)
            } catch {
              // 레거시 PasswordCredential 지원 브라우저 폴백
              // @ts-expect-error: legacy PasswordCredential
              if (window.PasswordCredential) {
                // @ts-expect-error: legacy PasswordCredential
                cred = new window.PasswordCredential({ id: email, password })
              }
            }
            if (cred) {
              await navAny.credentials.store?.(cred)
              console.log('🔐 브라우저에 자격 증명 저장 완료')
            }
          }
        } catch (credErr) {
          console.debug('Credential Management 저장 비지원 또는 실패:', credErr)
        }
      } else {
        setError(result.error || '로그인에 실패했습니다.')
      }
    } catch (error) {
      console.error('로그인 폼 오류:', error)
      if (error instanceof Error) {
        setError(`로그인 중 오류가 발생했습니다: ${error.message}`)
      } else {
        setError('로그인 중 알 수 없는 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">로그인</h2>
        <p className="text-sm text-gray-600 mt-1">
          계정에 로그인하여 서비스를 이용하세요
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        autoComplete="on"
        name="login"
        method="post"
        action="/api/auth/login"
      >
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 bg-red-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-600 text-xs">!</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">{error}</p>
                {error.includes('비밀번호') && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                    <p className="font-medium text-red-800 mb-1">💡 비밀번호 확인 방법:</p>
                    <ul className="space-y-1 text-red-700">
                      <li>• 대소문자를 정확히 입력했는지 확인</li>
                      <li>• 숫자와 특수문자 포함 여부 확인</li>
                      <li>• 테스트 계정: admin123 / user123</li>
                    </ul>
                  </div>
                )}
                {error.includes('등록되지 않은 이메일') && (
                  <div className="mt-2 p-2 bg-blue-100 rounded text-xs">
                    <p className="font-medium text-blue-800 mb-1">💡 해결 방법:</p>
                    <ul className="space-y-1 text-blue-700">
                      <li>• 이메일 주소를 다시 확인</li>
                      <li>• 테스트 계정 사용: 위의 복사 버튼 클릭</li>
                      <li>• 새 계정 생성: &quot;사용자 생성&quot; 탭 사용</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onPaste={(e) => {
              // ✅ 붙여넣기 시 자동으로 공백 제거
              e.preventDefault()
              const pastedText = e.clipboardData.getData('text').trim()
              setEmail(pastedText)
            }}
            placeholder="your@email.com"
            required
            autoComplete="username"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPaste={(e) => {
              // ✅ 붙여넣기 시 자동으로 공백 제거
              e.preventDefault()
              const pastedText = e.clipboardData.getData('text').trim()
              setPassword(pastedText)
            }}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-10"
        >
          {loading ? '로그인 중...' : '로그인'}
        </Button>
      </form>

      {onSwitchToSignup && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            계정이 없으신가요?{' '}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-blue-600 hover:text-blue-500 font-medium hover:underline"
            >
              사용자 생성
            </button>
          </p>
        </div>
      )}

      {/* ✅ 로그인 문제 해결 버튼 */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            if (confirm('로그인에 문제가 있나요?\n\n저장된 세션 데이터를 초기화하고 다시 시도합니다.\n\n계속하시겠습니까?')) {
              // 로컬스토리지의 Supabase 데이터 삭제
              const keys = Object.keys(localStorage)
              keys.forEach(key => {
                if (key.startsWith('sb-')) {
                  localStorage.removeItem(key)
                  console.log('🗑️ 삭제된 키:', key)
                }
              })
              
              console.log('✅ 세션 데이터 초기화 완료')
              alert('✅ 세션 데이터가 초기화되었습니다.\n\n페이지를 새로고침하고 다시 로그인하세요.')
              window.location.reload()
            }
          }}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          로그인 문제 해결 (세션 초기화)
        </button>
      </div>
    </div>
  )
}
