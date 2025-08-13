# Supabase Auth 설정 가이드

## 📋 **필요한 환경 변수**

`.env.local` 파일에 다음 환경 변수들을 추가하세요:

```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Sabre API 설정 (기존)
SABRE_CLIENT_ID=your_sabre_client_id
SABRE_CLIENT_SECRET=your_sabre_client_secret
```

## 🗄️ **데이터베이스 스키마 설정**

### 1. Supabase Auth 스키마 사용

이제 `user_profiles` 테이블을 생성할 필요가 없습니다. Supabase의 기본 `auth.users` 테이블과 `user_metadata`를 사용합니다.

### 2. 사용자 역할 설정

사용자 생성 시 `user_metadata`에 역할을 저장합니다:

```sql
-- 사용자 생성 시 자동으로 user_metadata에 역할이 저장됩니다
-- 별도의 테이블 생성이 필요하지 않습니다
```

### 2. 초기 관리자 계정 생성

```sql
-- Supabase Dashboard에서 직접 관리자 계정을 생성하는 것이 권장됩니다
-- 또는 API를 통해 생성할 수 있습니다

-- API를 통한 관리자 계정 생성 예시:
-- POST /api/auth/signup
-- {
--   "email": "admin@example.com",
--   "password": "your_admin_password",
--   "role": "admin"
-- }
```

## 🔐 **Auth 설정**

### 1. Supabase Dashboard에서 설정

1. **Authentication > Settings**로 이동
2. **Enable email confirmations** 체크 해제 (개발 환경용)
3. **Enable email change confirmations** 체크 해제 (개발 환경용)

### 2. 이메일 템플릿 설정 (선택사항)

**Authentication > Email Templates**에서 이메일 템플릿을 커스터마이징할 수 있습니다.

## 🚀 **테스트**

### 1. 회원가입 테스트

```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "role": "user"
  }'
```

### 2. 로그인 테스트

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. 사용자 목록 조회 테스트

```bash
curl -X GET http://localhost:3001/api/users/list
```

## 🔒 **보안 고려사항**

1. **Service Role Key**: 서버 사이드에서만 사용하고 클라이언트에 노출하지 마세요
2. **RLS 정책**: 적절한 Row Level Security 정책을 설정하세요
3. **비밀번호 정책**: 프로덕션에서는 강력한 비밀번호 정책을 적용하세요
4. **이메일 확인**: 프로덕션에서는 이메일 확인을 활성화하세요

## 🐛 **문제 해결**

### 일반적인 오류들

1. **"Service role key not found"**
   - `SUPABASE_SERVICE_ROLE_KEY` 환경 변수가 올바르게 설정되었는지 확인

2. **"Table 'user_profiles' does not exist"**
   - SQL 스키마가 올바르게 실행되었는지 확인

3. **"RLS policy violation"**
   - RLS 정책이 올바르게 설정되었는지 확인

4. **"Invalid JWT"**
   - Supabase URL과 키가 올바른지 확인

## 📚 **추가 리소스**

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase TypeScript Guide](https://supabase.com/docs/guides/api/typescript-support)
