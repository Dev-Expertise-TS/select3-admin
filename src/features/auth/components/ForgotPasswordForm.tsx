'use client'

import React, { useState } from 'react'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ForgotPasswordFormProps {
  onBack?: () => void
  className?: string
}

export function ForgotPasswordForm({ onBack, className }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setError('이메일을 입력해주세요.')
      return
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setError('올바른 이메일 형식을 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        setEmail('')
      } else {
        setError(result.error || '비밀번호 재설정 요청에 실패했습니다.')
      }
    } catch (error) {
      console.error('비밀번호 재설정 요청 오류:', error)
      setError('비밀번호 재설정 요청 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">비밀번호 찾기</h2>
        <p className="text-sm text-gray-600 mt-1">
          등록된 이메일 주소를 입력하시면<br />
          비밀번호 재설정 링크를 보내드립니다
        </p>
      </div>

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
                  비밀번호 재설정 링크가 전송되었습니다.
                </p>
                <p className="mt-2 text-sm text-green-700">
                  이메일을 확인하고 링크를 클릭하여 비밀번호를 재설정하세요.
                </p>
                <p className="mt-1 text-xs text-green-600">
                  이메일이 보이지 않으면 스팸 폴더를 확인해주세요.
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
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="reset-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10"
            >
              {loading ? '전송 중...' : '재설정 링크 전송'}
            </Button>
          </>
        )}

        {onBack && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              로그인으로 돌아가기
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
