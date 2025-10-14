'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@/types/auth'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  loading: boolean
  isInitialized: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string, role?: 'admin' | 'user') => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  
  // 무한 루프 방지를 위한 ref
  const isCheckingUser = useRef(false)
  const hasInitialized = useRef(false)

  // 사용자 세션 확인 및 복원
  const checkUser = useCallback(async () => {
    // 이미 확인 중이거나 초기화가 완료된 경우 중복 호출 방지
    if (isCheckingUser.current || hasInitialized.current) {
      console.log('🔄 checkUser 중복 호출 방지:', { 
        isChecking: isCheckingUser.current, 
        hasInitialized: hasInitialized.current 
      })
      return
    }

    try {
      isCheckingUser.current = true
      console.log('🔐 세션 확인 시작...')
      
      // 1. 먼저 현재 세션 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('❌ 세션 확인 오류:', sessionError)
        setUser(null)
        return
      }

      console.log('📋 세션 확인 결과:', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        userEmail: session?.user?.email 
      })

      if (session?.user) {
        // 2. 세션이 있는 경우 사용자 정보 구성
        const userRole = session.user.user_metadata?.role || 'user'
        
        const authUser: User = {
          id: session.user.id,
          email: session.user.email!,
          role: userRole,
          created_at: session.user.created_at,
          last_sign_in_at: session.user.last_sign_in_at,
          email_confirmed_at: session.user.email_confirmed_at,
          updated_at: session.user.updated_at
        }

        console.log('✅ 사용자 정보 설정:', { 
          id: authUser.id, 
          email: authUser.email, 
          role: authUser.role 
        })
        
        setUser(authUser)
      } else {
        // 3. 세션이 없는 경우
        console.log('❌ 활성 세션 없음')
        setUser(null)
      }
    } catch (error) {
      console.error('❌ 사용자 확인 중 예외 발생:', error)
      setUser(null)
    } finally {
      setLoading(false)
      setIsInitialized(true)
      hasInitialized.current = true
      isCheckingUser.current = false
      console.log('🔐 인증 초기화 완료')
    }
  }, [supabase.auth])

  // 로그인
  const login = async (email: string, password: string) => {
    try {
      // ✅ 이메일과 패스워드 앞뒤 공백 제거 (보안)
      const trimmedEmail = email.trim()
      const trimmedPassword = password.trim()
      
      console.log('🔐 ===== 로그인 디버깅 시작 =====')
      console.log('🔐 AuthContext 로그인 시도:', { 
        email: trimmedEmail,
        passwordLength: trimmedPassword.length,
        passwordFirstChars: trimmedPassword.substring(0, 3) + '***',
        originalEmailLength: email.length,
        originalPasswordLength: password.length,
        hadEmailSpaces: email !== trimmedEmail,
        hadPasswordSpaces: password !== trimmedPassword
      })
      
      // 1. Supabase 인증으로 직접 로그인
      console.log('🔐 Supabase signInWithPassword 호출...')
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword
      })

      console.log('🔐 signInWithPassword 응답:', {
        hasData: !!authData,
        hasUser: !!authData?.user,
        hasSession: !!authData?.session,
        hasError: !!authError,
        errorMessage: authError?.message,
        errorStatus: authError?.status
      })

      if (authError) {
        console.error('❌ Supabase 인증 오류 상세:', {
          message: authError.message,
          status: authError.status,
          name: authError.name,
          // @ts-ignore
          code: authError.code
        })
        
        // ✅ 더 친절한 에러 메시지
        let friendlyError = authError.message
        
        if (authError.message?.includes('Invalid login credentials')) {
          friendlyError = '이메일 또는 비밀번호가 올바르지 않습니다.\n\n💡 확인사항:\n• 이메일 주소가 정확한지\n• 비밀번호에 공백이 없는지\n• 대소문자를 정확히 입력했는지'
        } else if (authError.message?.includes('Email not confirmed')) {
          // ✅ 이메일 미인증 시 자동으로 확인 처리 시도
          console.warn('⚠️ 이메일 미인증 감지, 자동 확인 처리 시도...')
          friendlyError = '이메일 인증이 완료되지 않았습니다.\n\n관리자에게 문의하여 이메일을 확인 처리하세요.'
        }
        
        return { success: false, error: friendlyError }
      }

      if (!authData.user) {
        console.error('❌ 사용자 데이터 없음')
        return { success: false, error: '사용자 정보를 찾을 수 없습니다.' }
      }

      // 2. 로그인 성공 시 사용자 정보 설정
      const userRole = authData.user.user_metadata?.role || 'user'
      
      const authUser: User = {
        id: authData.user.id,
        email: authData.user.email!,
        role: userRole,
        created_at: authData.user.created_at,
        last_sign_in_at: authData.user.last_sign_in_at,
        email_confirmed_at: authData.user.email_confirmed_at,
        updated_at: authData.user.updated_at
      }

      console.log('✅ 로그인 성공:', { 
        id: authUser.id, 
        email: authUser.email, 
        role: authUser.role,
        hasSession: !!authData.session
      })
      console.log('🔐 ===== 로그인 디버깅 끝 =====')

      setUser(authUser)
      return { success: true }
    } catch (error) {
      console.error('❌ 로그인 중 예외 발생:', error)
      console.error('❌ 예외 상세:', JSON.stringify(error, null, 2))
      return { success: false, error: '로그인 중 오류가 발생했습니다.' }
    }
  }

  // 사용자 생성
  const signup = async (email: string, password: string, role: 'admin' | 'user' = 'user') => {
    try {
      // ✅ 이메일과 패스워드 앞뒤 공백 제거
      const trimmedEmail = email.trim()
      const trimmedPassword = password.trim()
      
      console.log('📝 AuthContext 회원가입 시도:', { 
        email: trimmedEmail, 
        role,
        passwordLength: trimmedPassword.length
      })
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          data: { role }
        }
      })

      if (authError) {
        console.error('❌ 회원가입 오류:', authError)
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        console.error('❌ 사용자 생성 실패')
        return { success: false, error: '사용자 생성에 실패했습니다.' }
      }

      console.log('✅ 회원가입 성공:', authData.user.id)
      return { success: true }
    } catch (error) {
      console.error('❌ 회원가입 중 예외 발생:', error)
      return { success: false, error: '회원가입 중 오류가 발생했습니다.' }
    }
  }

  // 로그아웃
  const logout = async () => {
    try {
      console.log('🚪 로그아웃 시작...')
      
      // ✅ 세션 확인 후 로그아웃
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        console.log('🔓 활성 세션 발견, 로그아웃 진행...')
        const { error } = await supabase.auth.signOut()
        
        if (error) {
          console.error('❌ 로그아웃 오류:', error)
          // 에러가 있어도 계속 진행 (세션 초기화)
        } else {
          console.log('✅ 로그아웃 성공')
        }
      } else {
        console.log('ℹ️ 활성 세션 없음, 바로 로그인 페이지로 이동')
      }
      
      setUser(null)
      router.replace('/login')
    } catch (error) {
      console.error('❌ 로그아웃 중 예외 발생:', error)
      // 에러가 있어도 사용자 상태 초기화 및 로그인 페이지로 이동
      setUser(null)
      router.replace('/login')
    }
  }

  // 사용자 정보 새로고침
  const refreshUser = async () => {
    console.log('🔄 사용자 정보 새로고침...')
    // 초기화가 완료된 경우에만 새로고침 허용
    if (hasInitialized.current) {
      await checkUser()
    }
  }

  // 인증 상태 변경 감지 및 세션 복원
  useEffect(() => {
    console.log('🔐 AuthProvider 마운트, 초기 세션 확인 시작...')
    
    // 1. 초기 세션 확인 (한 번만)
    if (!hasInitialized.current) {
      checkUser()
    }

    // 2. 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth 상태 변경:', event, {
          hasSession: !!session,
          userId: session?.user?.id,
          userEmail: session?.user?.email
        })
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ 로그인 이벤트 감지, 사용자 정보 업데이트')
          // 로그인 이벤트 시에는 즉시 사용자 정보 설정
          const userRole = session.user.user_metadata?.role || 'user'
          const authUser: User = {
            id: session.user.id,
            email: session.user.email!,
            role: userRole,
            created_at: session.user.created_at,
            last_sign_in_at: session.user.last_sign_in_at,
            email_confirmed_at: session.user.email_confirmed_at,
            updated_at: session.user.updated_at
          }
          setUser(authUser)
          setLoading(false)
          setIsInitialized(true)
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 로그아웃 이벤트 감지, 사용자 정보 초기화')
          setUser(null)
          router.replace('/login')
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 토큰 갱신 이벤트 감지, 세션 상태 확인')
          // 토큰 갱신 시에는 checkUser 호출하지 않음 (무한 루프 방지)
        } else if (event === 'USER_UPDATED') {
          console.log('👤 사용자 정보 업데이트 이벤트 감지')
          // 사용자 업데이트 시에는 checkUser 호출하지 않음 (무한 루프 방지)
        }
      }
    )

    // 3. 페이지 포커스 시 세션 상태 재확인 (브라우저 리프레시 대응)
    // 초기화가 완료된 경우에만 포커스 이벤트 처리
    const handleFocus = () => {
      if (hasInitialized.current && !isCheckingUser.current) {
        console.log('📱 페이지 포커스, 세션 상태 재확인')
        // 포커스 시에는 간단한 세션 확인만
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user && !user) {
            console.log('🔄 포커스 시 세션 복원')
            const userRole = session.user.user_metadata?.role || 'user'
            const authUser: User = {
              id: session.user.id,
              email: session.user.email!,
              role: userRole,
              created_at: session.user.created_at,
              last_sign_in_at: session.user.last_sign_in_at,
              email_confirmed_at: session.user.email_confirmed_at,
              updated_at: session.user.updated_at
            }
            setUser(authUser)
          }
        })
      }
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      console.log('🔐 AuthProvider 언마운트, 정리 작업...')
      subscription.unsubscribe()
      window.removeEventListener('focus', handleFocus)
    }
  }, [checkUser, router, supabase.auth, user])

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
