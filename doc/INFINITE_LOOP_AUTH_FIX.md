# 인증 시스템 무한 루프 문제 해결 가이드

## 🚨 **문제 상황**
```
🔄 AppRoot - 인증 초기화 대기 중...
🏠 AppRoot - 인증 상태 확인: Object
🔐 AuthProvider 마운트, 초기 세션 확인 시작...
🔐 세션 확인 시작...
🔐 Auth 상태 변경: SIGNED_IN Object
✅ 로그인 이벤트 감지, 사용자 정보 업데이트
🔐 세션 확인 시작...
📱 페이지 포커스, 세션 상태 재확인
🔐 세션 확인 시작...
```
시스템 초기화 중 무한 루프 발생

## 🔍 **문제 원인 분석**

### 1. **중복 함수 호출**
- `checkUser` 함수가 여러 이벤트에서 중복 호출
- `SIGNED_IN` 이벤트와 `onAuthStateChange`에서 동시 처리

### 2. **이벤트 핸들러 중복**
- `TOKEN_REFRESHED`, `USER_UPDATED` 이벤트에서 `checkUser` 호출
- 페이지 포커스 시마다 `checkUser` 호출

### 3. **상태 업데이트 순환**
- 상태 변경 → 이벤트 발생 → 상태 변경 → 이벤트 발생의 무한 반복

## ✅ **해결 방법**

### 1. **중복 호출 방지**
```typescript
// 무한 루프 방지를 위한 ref
const isCheckingUser = useRef(false)
const hasInitialized = useRef(false)

const checkUser = useCallback(async () => {
  // 이미 확인 중이거나 초기화가 완료된 경우 중복 호출 방지
  if (isCheckingUser.current || hasInitialized.current) {
    console.log('🔄 checkUser 중복 호출 방지')
    return
  }
  
  try {
    isCheckingUser.current = true
    // ... 세션 확인 로직
  } finally {
    isCheckingUser.current = false
    hasInitialized.current = true
  }
}, [supabase.auth])
```

### 2. **이벤트 핸들러 최적화**
```typescript
// 인증 상태 변경 감지
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      // 로그인 이벤트 시에는 즉시 사용자 정보 설정
      const authUser: AuthUser = { /* ... */ }
      setUser(authUser)
      setLoading(false)
      setIsInitialized(true)
    } else if (event === 'TOKEN_REFRESHED') {
      // 토큰 갱신 시에는 checkUser 호출하지 않음
      console.log('🔄 토큰 갱신 이벤트 감지')
    } else if (event === 'USER_UPDATED') {
      // 사용자 업데이트 시에는 checkUser 호출하지 않음
      console.log('👤 사용자 정보 업데이트 이벤트 감지')
    }
  }
)
```

### 3. **포커스 이벤트 최적화**
```typescript
// 페이지 포커스 시 세션 상태 재확인
const handleFocus = () => {
  if (hasInitialized.current && !isCheckingUser.current) {
    console.log('📱 페이지 포커스, 세션 상태 재확인')
    // 포커스 시에는 간단한 세션 확인만
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !user) {
        // 세션이 있지만 사용자 상태가 없는 경우만 복원
        const authUser: AuthUser = { /* ... */ }
        setUser(authUser)
      }
    })
  }
}
```

### 4. **리다이렉트 중복 방지**
```typescript
// AppRoot와 AuthGuard에서 리다이렉트 중복 방지
const hasRedirected = useRef(false)

useEffect(() => {
  // 이미 리다이렉트된 경우 중복 처리 방지
  if (hasRedirected.current) {
    return
  }
  
  if (isInitialized && !loading) {
    if (!user && !hideShell) {
      hasRedirected.current = true
      router.replace('/login')
      return
    }
  }
}, [isInitialized, loading, user, hideShell, router])
```

## 🛠️ **수정된 파일들**

### **인증 컨텍스트**
- `src/features/auth/contexts/AuthContext.tsx` - 중복 호출 방지 및 이벤트 최적화

### **앱 루트**
- `src/components/shared/app-root.tsx` - 리다이렉트 중복 방지

### **인증 가드**
- `src/components/shared/auth-guard.tsx` - 리다이렉트 중복 방지

## 🔧 **테스트 방법**

### 1. **무한 루프 확인**
1. 브라우저 개발자 도구 콘솔 열기
2. 페이지 새로고침
3. 로그가 반복되지 않는지 확인

### 2. **인증 상태 확인**
1. 로그인 성공 후 홈 페이지 이동
2. 브라우저 리프레시
3. 로그인 상태 유지 확인

### 3. **로그 확인**
- `🔄 checkUser 중복 호출 방지` 메시지 확인
- `🔐 인증 초기화 완료` 메시지 확인
- 무한 반복 로그 없음 확인

## 📋 **로그 확인 포인트**

### **정상 동작 로그**
- `🔐 AuthProvider 마운트, 초기 세션 확인 시작...`
- `🔐 세션 확인 시작...`
- `✅ 사용자 정보 설정: {...}`
- `🔐 인증 초기화 완료`

### **중복 호출 방지 로그**
- `🔄 checkUser 중복 호출 방지: {...}`
- `📱 페이지 포커스, 세션 상태 재확인`
- `🔄 포커스 시 세션 복원`

## 🎯 **예상 결과**

### **수정 전**
- `checkUser` 함수 무한 반복 호출
- 시스템 초기화 중 무한 루프
- 브라우저 성능 저하

### **수정 후**
- `checkUser` 함수 한 번만 호출
- 정상적인 인증 상태 초기화
- 안정적인 인증 시스템

## 🔍 **문제 해결 체크리스트**

- [ ] 무한 루프 로그 확인
- [ ] 중복 호출 방지 로그 확인
- [ ] 인증 상태 정상 초기화 확인
- [ ] 브라우저 리프레시 시 로그인 상태 유지 확인
- [ ] 성능 개선 확인

## 📞 **추가 지원**

문제가 지속되면 다음을 확인하세요:
1. 브라우저 개발자 도구의 콘솔 로그
2. React DevTools의 컴포넌트 렌더링 상태
3. 네트워크 탭의 API 호출 상태
4. 메모리 사용량 및 성능

이제 인증 시스템이 안정적으로 작동하고 무한 루프 없이 정상적인 초기화를 수행할 것입니다.
