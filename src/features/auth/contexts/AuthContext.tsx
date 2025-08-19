'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser } from '@/types/auth'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  isInitialized: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string, role?: 'admin' | 'user') => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // 사용자 세션 확인
  const checkUser = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('세션 확인 오류:', error)
        setUser(null)
        return
      }

      if (session?.user) {
        // 사용자 메타데이터에서 역할 확인
        const userRole = session.user.user_metadata?.role || 'user'
        
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          role: userRole,
          created_at: session.user.created_at,
          last_sign_in_at: session.user.last_sign_in_at,
          email_confirmed_at: session.user.email_confirmed_at,
          updated_at: session.user.updated_at
        }

        setUser(authUser)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('사용자 확인 오류:', error)
      setUser(null)
    } finally {
      setLoading(false)
      setIsInitialized(true)
    }
  }, [supabase.auth])

  // 로그인
  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 로그인 시도:', email)
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      console.log('📡 응답 상태:', response.status, response.statusText)

      if (!response.ok) {
        console.error('❌ HTTP 오류:', response.status, response.statusText)
        return { success: false, error: `서버 오류: ${response.status}` }
      }

      let result
      try {
        const responseText = await response.text()
        console.log('📝 응답 텍스트:', responseText)
        
        if (!responseText.trim()) {
          return { success: false, error: '서버에서 빈 응답을 받았습니다.' }
        }
        
        result = JSON.parse(responseText)
        console.log('✅ JSON 파싱 성공:', result)
      } catch (parseError) {
        console.error('❌ JSON 파싱 오류:', parseError)
        return { success: false, error: '서버 응답을 파싱할 수 없습니다.' }
      }

      if (result.success && result.data) {
        setUser(result.data)
        // 로그인 성공 시 상태만 업데이트 (페이지 이동은 useEffect에서 처리)
        return { success: true }
      } else {
        return { success: false, error: result.error || '알 수 없는 오류' }
      }
    } catch (error) {
      console.error('❌ 로그인 네트워크 오류:', error)
      return { success: false, error: '로그인 중 오류가 발생했습니다.' }
    }
  }

  // 사용자 생성
  const signup = async (email: string, password: string, role: 'admin' | 'user' = 'user') => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, role }),
      })

      const result = await response.json()

      if (result.success && result.data) {
        setUser(result.data)
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('사용자 생성 오류:', error)
      return { success: false, error: '사용자 생성 중 오류가 발생했습니다.' }
    }
  }

  // 로그아웃
  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      
      if (response.ok) {
        setUser(null)
        // 로그아웃 후 로그인 페이지로 이동
        router.replace('/login')
      } else {
        console.error('로그아웃 응답 오류:', response.status)
        // 응답 오류가 발생해도 로컬 상태는 초기화
        setUser(null)
        router.replace('/login')
      }
    } catch (error) {
      console.error('로그아웃 오류:', error)
      // 오류가 발생해도 로컬 상태는 초기화
      setUser(null)
      router.replace('/login')
    }
  }

  // 사용자 정보 새로고침
  const refreshUser = async () => {
    await checkUser()
  }

  // 인증 상태 변경 감지
  useEffect(() => {
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth 상태 변경:', event, session?.user?.email)
        if (event === 'SIGNED_IN' && session?.user) {
          await checkUser()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          router.replace('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [checkUser, router, supabase.auth])

  const value: AuthContextType = {
    user,
    loading,
    isInitialized,
    login,
    signup,
    logout,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
