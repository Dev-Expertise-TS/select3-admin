# 브라우저 리프레시 시 로그인 상태 유지 문제 해결 가이드

## 🚨 **문제 상황**
브라우저를 리프레시하면 다시 로그인 화면으로 돌아가는 문제

## 🔍 **문제 원인 분석**

### 1. **Supabase 세션과 클라이언트 상태 동기화 문제**
- `AuthContext`에서 Supabase 세션을 제대로 확인하지 않음
- 브라우저 리프레시 시 세션 복원 로직 부족

### 2. **인증 상태 초기화 순서 문제**
- `isInitialized`와 `loading` 상태 관리 부족
- 인증 상태 확인 전에 리다이렉트가 발생

### 3. **세션 이벤트 처리 부족**
- `TOKEN_REFRESHED`, `USER_UPDATED` 등 중요한 이벤트 미처리
- 페이지 포커스 시 세션 상태 재확인 부족

## ✅ **해결 방법**

### 1. **AuthContext 개선**
```typescript
// 사용자 세션 확인 및 복원
const checkUser = useCallback(async () => {
  try {
    console.log('🔐 세션 확인 시작...')
    
    // 1. 먼저 현재 세션 확인
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (session?.user) {
      // 2. 세션이 있는 경우 사용자 정보 구성
      const userRole = session.user.user_metadata?.role || 'user'
      const authUser: AuthUser = { /* ... */ }
      setUser(authUser)
    } else {
      // 3. 세션이 없는 경우
      setUser(null)
    }
  } catch (error) {
    console.error('❌ 사용자 확인 중 예외 발생:', error)
    setUser(null)
  } finally {
    setLoading(false)
    setIsInitialized(true)
  }
}, [supabase.auth])
```

### 2. **직접 Supabase 인증 사용**
```typescript
// 로그인 - API 대신 Supabase 직접 사용
const login = async (email: string, password: string) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    if (authData.user) {
      const authUser: AuthUser = { /* ... */ }
      setUser(authUser)
      return { success: true }
    }
  } catch (error) {
    return { success: false, error: '로그인 중 오류가 발생했습니다.' }
  }
}
```

### 3. **세션 이벤트 처리 개선**
```typescript
// 인증 상태 변경 감지 및 세션 복원
useEffect(() => {
  // 1. 초기 세션 확인
  checkUser()

  // 2. 인증 상태 변경 감지
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await checkUser()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        router.replace('/login')
      } else if (event === 'TOKEN_REFRESHED') {
        await checkUser()
      } else if (event === 'USER_UPDATED') {
        await checkUser()
      }
    }
  )

  // 3. 페이지 포커스 시 세션 상태 재확인 (브라우저 리프레시 대응)
  const handleFocus = () => {
    checkUser()
  }
  window.addEventListener('focus', handleFocus)

  return () => {
    subscription.unsubscribe()
    window.removeEventListener('focus', handleFocus)
  }
}, [checkUser, router, supabase.auth])
```

### 4. **AuthGuard 및 AppRoot 개선**
```typescript
// 인증 상태 확인 개선
useEffect(() => {
  if (isInitialized && !loading) {
    if (!user) {
      router.replace(redirectTo)
      return
    }
    // 권한 확인...
  }
}, [user, loading, isInitialized, requiredRole, redirectTo, router])

// 로딩 상태 처리 개선
if (!isInitialized || loading) {
  return <LoadingSpinner message="인증 확인 중..." />
}
```

## 🛠️ **수정된 파일들**

### **인증 컨텍스트**
- `src/features/auth/contexts/AuthContext.tsx` - 세션 관리 및 동기화 개선

### **인증 가드**
- `src/components/shared/auth-guard.tsx` - 인증 상태 확인 개선

### **앱 루트**
- `src/components/shared/app-root.tsx` - 인증 상태 관리 개선

### **로그인 페이지**
- `src/app/login/page.tsx` - 인증 상태 확인 및 리다이렉트 개선

## 🔧 **테스트 방법**

### 1. **로그인 테스트**
1. 로그인 페이지에서 이메일/비밀번호 입력
2. 로그인 성공 후 홈 페이지 이동 확인
3. 브라우저 개발자 도구에서 로그 확인

### 2. **브라우저 리프레시 테스트**
1. 로그인 후 홈 페이지에서 F5 또는 새로고침 버튼 클릭
2. 로그인 상태 유지 확인
3. 로그인 페이지로 돌아가지 않는지 확인

### 3. **세션 복원 테스트**
1. 로그인 후 브라우저 탭을 닫고 다시 열기
2. 다른 페이지로 이동 후 뒤로 가기
3. 세션이 유지되는지 확인

## 📋 **로그 확인 포인트**

### **AuthContext 로그**
- `🔐 세션 확인 시작...`
- `📋 세션 확인 결과: {...}`
- `✅ 사용자 정보 설정: {...}`
- `🔐 인증 초기화 완료`

### **AuthGuard 로그**
- `🛡️ AuthGuard - 인증 상태 확인: {...}`
- `✅ 인증 확인 완료, 접근 허용`
- `🔄 AuthGuard - 로딩 중: {...}`

### **AppRoot 로그**
- `🏠 AppRoot - 인증 상태 확인: {...}`
- `🔒 로그인하지 않은 사용자, 로그인 페이지로 자동 리다이렉트`
- `✅ 이미 로그인된 사용자, 홈으로 리다이렉트`

## 🎯 **예상 결과**

### **로그인 전**
- 로그인 페이지에서 정상적으로 로그인 가능
- 인증 상태 초기화 중 로딩 표시

### **로그인 후**
- 홈 페이지로 정상 이동
- 인증 상태가 클라이언트에 저장됨

### **브라우저 리프레시 후**
- 로그인 상태 유지
- 로그인 페이지로 돌아가지 않음
- 세션이 자동으로 복원됨

## 🔍 **문제 해결 체크리스트**

- [ ] 로그인 성공 후 홈 페이지 이동 확인
- [ ] 브라우저 리프레시 후 로그인 상태 유지 확인
- [ ] 개발자 도구에서 인증 로그 확인
- [ ] 세션 복원 로그 확인
- [ ] 페이지 포커스 시 세션 재확인 확인

## 📞 **추가 지원**

문제가 지속되면 다음을 확인하세요:
1. 브라우저 개발자 도구의 콘솔 로그
2. Supabase 대시보드의 인증 로그
3. 브라우저의 쿠키 및 로컬 스토리지
4. 환경 변수 설정

이제 브라우저를 리프레시해도 로그인 상태가 유지되고, 자동으로 로그인 페이지로 돌아가지 않을 것입니다.
