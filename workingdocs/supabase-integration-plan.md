# Supabase 통합 계획 보고서

## 1. 현재 프로젝트 현황

- **프레임워크**: Next.js 15.4.6 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS 4.0
- **컴포넌트**: shadcn/ui 기반 (components.json 존재)
- **패키지 매니저**: pnpm
- **기존 lib 구조**: `lib/utils.ts` 파일 존재

## 2. 환경 변수 설정

### .env.example 파일 생성 완료

다음 환경 변수들이 설정되어 있습니다:

**필수 변수:**
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key (클라이언트 사이드용)

**선택적 변수:**
- `SUPABASE_SERVICE_ROLE_KEY`: 서버 사이드 작업용 (민감 정보)
- `DATABASE_URL`: 직접 데이터베이스 연결용 (고급 사용)
- `SUPABASE_JWT_SECRET`: JWT 검증용
- `NODE_ENV`: 개발/프로덕션 환경 구분

### 로컬 개발 환경
```bash
# .env.local 파일 생성 필요
cp .env.example .env.local
# 실제 Supabase 프로젝트 값으로 업데이트
```

### Vercel 프로덕션 환경
- Vercel 대시보드 Environment Variables에서 설정
- `NEXT_PUBLIC_*` 변수는 클라이언트에서 접근 가능
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 사이드 전용

## 3. 필요한 의존성 모듈

### 핵심 의존성
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

### 추가 권장 의존성 (필요시)
```json
{
  "devDependencies": {
    "@supabase/auth-helpers-nextjs": "^0.8.7",
    "@supabase/auth-helpers-react": "^0.4.2"
  }
}
```

## 4. 유틸리티 함수 구조 계획

### 디렉토리 구조
```
lib/
├── supabase/
│   ├── client.ts        # 클라이언트 사이드 Supabase 클라이언트
│   ├── server.ts        # 서버 사이드 Supabase 클라이언트  
│   ├── middleware.ts    # Auth 미들웨어 설정
│   └── types.ts         # Supabase 관련 타입 정의
├── utils.ts            # 기존 유틸리티 함수들 (유지)
```

### 주요 유틸리티 함수들

#### 1. client.ts (클라이언트 사이드)
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
```

#### 2. server.ts (서버 사이드)
```typescript
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// 쿠키 기반 서버 클라이언트 생성 함수
export function createServerClient() {
  // 구현 세부사항
}

// 서비스 롤 클라이언트 (관리자 작업용)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

#### 3. middleware.ts (미들웨어)
```typescript
// Next.js 미들웨어에서 auth 상태 관리
export { auth } from '@supabase/auth-helpers-nextjs'
```

#### 4. types.ts (타입 정의)
```typescript
// 데이터베이스 스키마 타입 정의
export type Database = {
  // 스키마 정의
}
```

## 5. API 라우트 통합 방식

### 서버 사이드 API Routes
- `app/api/` 디렉토리에서 `server.ts` 클라이언트 사용
- Row Level Security (RLS) 정책 활용
- 서비스 롤 키는 관리자 작업에만 사용

### 클라이언트 사이드 Components
- React 컴포넌트에서 `client.ts` 사용
- 사용자 인증 상태 기반 쿼리 실행
- 실시간 구독 기능 활용

## 6. 보안 고려사항

### Row Level Security (RLS)
- 모든 테이블에 RLS 정책 설정 권장
- 사용자별 데이터 접근 제어

### API 키 관리
- Public anon key: 클라이언트에서 안전하게 사용 가능
- Service role key: 서버에서만 사용, 절대 클라이언트 노출 금지

## 7. 구현 단계

### Phase 1: 기본 설정
1. 의존성 설치
2. 환경 변수 설정
3. 기본 클라이언트 생성

### Phase 2: 유틸리티 함수 구현
1. `lib/supabase/client.ts` 구현
2. `lib/supabase/server.ts` 구현
3. 타입 정의 추가

### Phase 3: API 통합
1. 샘플 API 라우트 생성
2. 클라이언트 컴포넌트 예제
3. 인증 플로우 구현

## 8. 배포 체크리스트

### 로컬 개발
- [ ] `.env.local` 파일 생성 및 설정
- [ ] Supabase 로컬 개발 환경 구축 (선택사항)

### Vercel 프로덕션
- [ ] Environment Variables 설정
- [ ] 프로덕션 Supabase 프로젝트 연결
- [ ] RLS 정책 적용 확인

---

**작성일**: 2025-08-08  
**승인 대기 중**: 사용자 검토 후 구현 진행 예정