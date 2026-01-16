'use client'

import React from 'react'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { ChangePasswordForm } from '@/features/auth/components/ChangePasswordForm'
import { User, Lock } from 'lucide-react'
import { AuthGuard } from '@/components/shared/auth-guard'

function ProfilePageContent() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <User className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            내 프로필
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            계정 정보 및 비밀번호를 관리할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 계정 정보 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">계정 정보</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
              {user?.email || '-'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              역할
            </label>
            <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
              {user?.role === 'admin' ? '관리자' : '사용자'}
            </div>
          </div>
          {user?.created_at && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                가입일
              </label>
              <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
                {new Date(user.created_at).toLocaleString('ko-KR')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 비밀번호 변경 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">비밀번호 변경</h2>
        </div>
        <ChangePasswordForm 
          onSuccess={() => {
            console.log('비밀번호 변경 성공')
          }}
        />
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <AuthGuard requiredRole="user">
      <div className="container mx-auto px-4 py-8">
        <ProfilePageContent />
      </div>
    </AuthGuard>
  )
}
