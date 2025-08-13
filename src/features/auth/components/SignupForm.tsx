'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface SignupFormProps {
  onSwitchToLogin?: () => void
  className?: string
}

export function SignupForm({ onSwitchToLogin, className }: SignupFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const { signup } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    // 비밀번호 길이 확인
    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    setLoading(true)

    try {
      const result = await signup(email, password)
      
      if (result.success) {
        setSuccess('사용자 생성이 완료되었습니다!')
        // 폼 초기화
        setEmail('')
        setPassword('')
        setConfirmPassword('')
      } else {
        setError(result.error || '사용자 생성에 실패했습니다.')
      }
    } catch (error) {
      setError('사용자 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">사용자 신청</h2>
        <p className="text-sm text-gray-600 mt-1">
          새로운 계정을 생성하여 서비스를 이용하세요
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
        
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
            {success}
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
            placeholder="your@email.com"
            required
            autoComplete="username"
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
            placeholder="••••••••"
            required
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">최소 6자 이상</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호 확인
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            className="w-full"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-10"
        >
          {loading ? '사용자 신청 중...' : '사용자 신청'}
        </Button>
      </form>

      {onSwitchToLogin && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-500 font-medium hover:underline"
            >
              로그인으로 돌아가기
            </button>
          </p>
        </div>
      )}
    </div>
  )
}
