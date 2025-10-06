# Select3 Admin - 호텔 통합 관리 시스템

Select3 Admin은 프리미엄 호텔과 리조트를 위한 종합 관리 플랫폼입니다. Next.js 15 App Router, TypeScript, Supabase를 기반으로 구축되었으며, 호텔 정보 관리, 이미지 마이그레이션, 체인/브랜드 연결, 혜택 관리, AI 기반 위치 정보 추출, 프로모션 관리 등 다양한 기능을 제공합니다.

## ✨ 핵심 특징

- 🏨 **포괄적인 호텔 관리**: 기본 정보부터 이미지, 위치, 프로모션까지 통합 관리
- 🤖 **AI 기반 데이터 추출**: OpenAI API를 활용한 자동 위치 정보 추출
- 🖼️ **고급 이미지 관리**: Supabase Storage 기반 이미지 업로드, 마이그레이션, 최적화
- 🔄 **실시간 동기화**: TanStack Query와 Supabase 실시간 구독
- 🎯 **직관적인 UX**: shadcn/ui 기반의 모던하고 일관된 사용자 경험
- 🔐 **강력한 보안**: Row Level Security (RLS)와 환경 변수 관리

## 📋 목차

- [기술 스택](#기술-스택)
- [주요 기능](#주요-기능)
- [프로젝트 구조](#프로젝트-구조)
- [설치 및 실행](#설치-및-실행)
- [환경 설정](#환경-설정)
- [API 문서](#api-문서)
- [데이터베이스 스키마](#데이터베이스-스키마)
- [개발 가이드](#개발-가이드)
- [배포](#배포)
- [기여하기](#기여하기)

## 🛠 기술 스택

### Frontend
- **Next.js 15** - App Router 기반 React 프레임워크
- **TypeScript** - 타입 안전성을 위한 정적 타입 시스템
- **Tailwind CSS v4** - 유틸리티 우선 CSS 프레임워크
- **shadcn/ui** - 재사용 가능한 UI 컴포넌트 라이브러리
- **TanStack Query** - 서버 상태 관리 및 캐싱

### Backend
- **Next.js API Routes** - 서버리스 API 엔드포인트
- **Supabase** - PostgreSQL 기반 백엔드 서비스
- **Row Level Security (RLS)** - 데이터베이스 보안

### 개발 도구
- **ESLint** - 코드 품질 관리
- **Prettier** - 코드 포맷팅
- **Vitest** - 단위 테스트
- **pnpm** - 패키지 매니저

## 🚀 주요 기능

### 1. 호텔 정보 관리
- **고급 검색**: 한글명, 영문명, Sabre ID로 실시간 검색 및 자동완성
- **호텔 상세 정보 편집**: 
  - 기본 정보 (호텔명, Sabre ID, Rate Plan Codes)
  - 위치 정보 (주소, 도시, 국가, 대륙)
  - 체인/브랜드 연결
  - 혜택 매핑 및 순서 관리
- **실시간 데이터 동기화**: Supabase 실시간 구독 및 TanStack Query 캐싱
- **Sabre API 연동**: 실시간 호텔 상세 정보 조회 및 Rate Plan 테스트

### 2. 이미지 관리 및 마이그레이션
- **Supabase Storage 통합**: `hotel-media` 버킷 기반 이미지 저장소
- **이미지 업로드/삭제**: 
  - 드래그 앤 드롭 또는 클릭 업로드
  - 즉시 Storage 업로드 및 실시간 미리보기
  - 개별 이미지 삭제 기능
- **경로 마이그레이션**:
  - 레거시 외부 URL을 Supabase Storage로 자동 마이그레이션
  - slug 기반 표준 파일명 생성 (`{slug}-{sabre_id}-{seq}.{ext}`)
  - DB 컬럼 (`image_1` ~ `image_5`) 자동 업데이트
- **본문 이미지 마이그레이션**:
  - `property_details`, `property_location` 컬럼의 HTML 이미지 자동 추출
  - 추출된 이미지를 Storage에 업로드 후 본문 URL 자동 교체
  - 정규식 기반 이미지 URL 파싱 및 처리
- **일괄 마이그레이션**:
  - 개별 호텔 3단계 마이그레이션 (경로 + 본문 추출 + 본문 업로드)
  - 전체 호텔 대상 일괄 마이그레이션
  - 선택 호텔 마이그레이션 (페이지네이션 지원)
  - 실시간 진행 상황 표시 및 실패 호텔 리포트

### 3. AI 기반 위치 정보 추출
- **OpenAI API 통합**: GPT-4o-mini 모델을 활용한 자동 위치 정보 추출
- **주소 파싱**: 
  - 호텔 주소에서 도시, 국가, 대륙 자동 추출
  - 한글/영문 이중 언어 지원
  - 일관성 있는 표준 명칭 사용 (예: "South Korea", "Seoul")
- **단일 호텔 테스트**: 개별 호텔 주소로 AI 추출 테스트
- **일괄 마이그레이션**: 
  - 전체 호텔 대상 위치 정보 일괄 생성
  - Server-Sent Events (SSE)로 실시간 진행 상황 스트리밍
  - Rate Limiting 방지 딜레이 설정
  - 오류 처리 및 재시도 로직

### 4. 체인/브랜드 관리
- **체인 관리**: 호텔 체인 정보 CRUD 작업
- **브랜드 관리**: 호텔 브랜드 정보 관리 및 체인 연결
- **호텔 연결**: 
  - 호텔을 특정 체인/브랜드에 연결
  - 실시간 연결 상태 표시
  - 즉시 UI 반영 및 검증
- **인라인 생성**: 데이터 테이블 내에서 직접 체인/브랜드 추가

### 5. 혜택 관리
- **혜택 카탈로그**: 마스터 혜택 정보 관리 (`select_hotel_benefits`)
- **호텔별 혜택 매핑**: 
  - 호텔과 혜택 간 다대다 연결 (`select_hotel_benefits_map`)
  - 팝업 인터페이스로 다중 혜택 선택
  - 드래그 앤 드롭으로 혜택 순서 조정
- **시각적 피드백**: 
  - 드래그 중 핑크 하이라이트
  - 드롭 완료 후 블루 하이라이트
  - 저장 후 노란색 플래시 효과
- **저장 확인 모달**: "변경 사항을 저장하였습니다" 메시지

### 6. 프로모션 관리
- **프로모션 CRUD**: 
  - 프로모션 생성, 수정, 삭제
  - 예약 기간 (시작/종료), 체크인 기간 (시작/종료) 설정
  - 프로모션 설명 및 노트 관리
- **호텔 매핑**: 
  - 프로모션에 호텔 연결
  - 호텔 검색 및 자동완성
  - 실시간 매핑 상태 표시
- **인라인 편집**: 
  - 데이터 테이블 내에서 직접 프로모션 수정
  - 연결된 호텔 정보 표시
  - Upsert 방식 저장 (추가/변경 자동 감지)
- **호텔 프로모션 관리 팝업**: 
  - 호텔명 클릭 시 연결된 프로모션 목록 표시
  - 팝업 내에서 프로모션 삭제
  - 프로모션 클릭 시 상세 편집 화면으로 이동
- **시각적 강조**: 
  - 새로 추가된 매핑 3초간 녹색 하이라이트
  - 프로모션 ID 내림차순 정렬

### 7. 광고 관리
- **히어로 배너**: 메인 페이지 히어로 캐러셀 관리
- **프로모션 배너**: 프로모션 배너 이미지 관리
- **일반 배너**: 사이트 내 배너 관리

### 8. 데이터 마이그레이션
- **이미지 마이그레이션**: 레거시 이미지 URL을 Supabase Storage로 이동
- **위치 정보 마이그레이션**: AI 기반 자동 위치 정보 추출 및 업데이트
- **배치 처리**: 대량 데이터 효율적 처리 및 진행 상황 모니터링
- **오류 처리**: 실패 항목 리포트 및 재시도 기능

### 9. 사용자 관리
- **인증 시스템**: Supabase Auth 기반 로그인/로그아웃
- **사용자 CRUD**: 사용자 생성, 조회, 수정, 삭제
- **권한 관리**: 역할 기반 접근 제어 (향후 확장 예정)

## 📁 프로젝트 구조

```
select3-admin/
├── src/
│   ├── app/                                    # Next.js 15 App Router
│   │   ├── admin/                              # 관리자 페이지
│   │   │   ├── advertisements/                 # 광고 관리
│   │   │   │   └── _components/                # 광고 관련 컴포넌트
│   │   │   ├── benefits/                       # 혜택 관리
│   │   │   │   └── manage/                     # 혜택 마스터 관리
│   │   │   ├── chain-brand/                    # 체인/브랜드 관리
│   │   │   │   └── _components/                # 체인/브랜드 컴포넌트
│   │   │   ├── data-migration/                 # 데이터 마이그레이션
│   │   │   ├── hotel-articles/                 # 호텔 아티클 관리
│   │   │   ├── hotel-content/                  # 호텔 콘텐츠 관리
│   │   │   ├── hotel-images/                   # 호텔 이미지 관리
│   │   │   │   └── _components/                # 이미지 관리 컴포넌트
│   │   │   ├── hotel-search/                   # 호텔 검색
│   │   │   ├── hotel-update/                   # 호텔 정보 수정
│   │   │   │   ├── [sabre]/                    # 동적 라우트 (Sabre ID)
│   │   │   │   └── _components/                # 호텔 업데이트 컴포넌트
│   │   │   ├── membership/                     # 멤버십 관리
│   │   │   ├── promotions/                     # 프로모션 관리
│   │   │   │   └── _components/                # 프로모션 컴포넌트
│   │   │   ├── sabre-id/                       # Sabre ID 관리
│   │   │   └── users/                          # 사용자 관리
│   │   ├── api/                                # API 라우트
│   │   │   ├── auth/                           # 인증 API
│   │   │   │   ├── login/                      # 로그인
│   │   │   │   ├── logout/                     # 로그아웃
│   │   │   │   └── signup/                     # 회원가입
│   │   │   ├── benefits/                       # 혜택 API
│   │   │   │   ├── list/                       # 혜택 목록
│   │   │   │   └── manage/                     # 혜택 관리 (생성/수정/삭제)
│   │   │   ├── chain-brand/                    # 체인/브랜드 API
│   │   │   │   ├── brand/                      # 브랜드 CRUD
│   │   │   │   ├── chain/                      # 체인 CRUD
│   │   │   │   ├── list/                       # 체인/브랜드 목록
│   │   │   │   └── schema/                     # 스키마 조회
│   │   │   ├── data-migration/                 # 데이터 마이그레이션 API
│   │   │   │   ├── bulk-location-migration/    # 일괄 위치 마이그레이션
│   │   │   │   └── extract-location/           # 위치 정보 추출
│   │   │   ├── hotel/                          # 호텔 API
│   │   │   │   ├── content/                    # 호텔 콘텐츠
│   │   │   │   ├── images/                     # 호텔 이미지
│   │   │   │   ├── search/                     # 호텔 검색
│   │   │   │   ├── suggest/                    # 호텔 자동완성
│   │   │   │   ├── update/                     # 호텔 정보 업데이트
│   │   │   │   └── update-rate-plan-codes/     # Rate Plan Code 업데이트
│   │   │   ├── hotel-images/                   # 호텔 이미지 관리 API
│   │   │   │   ├── bulk/                       # 일괄 이미지 처리
│   │   │   │   │   ├── list/                   # 호텔 목록
│   │   │   │   │   ├── migrate/                # 일괄 마이그레이션
│   │   │   │   │   └── migrate-selected/       # 선택 호텔 마이그레이션
│   │   │   │   ├── content/                    # 본문 이미지 처리
│   │   │   │   ├── delete/                     # 이미지 삭제
│   │   │   │   ├── list/                       # 이미지 목록
│   │   │   │   ├── migrate-paths/              # 경로 마이그레이션
│   │   │   │   └── upload/                     # 이미지 업로드
│   │   │   ├── promotions/                     # 프로모션 API
│   │   │   ├── sabre/                          # Sabre API
│   │   │   │   └── token/                      # Sabre 토큰
│   │   │   └── users/                          # 사용자 API
│   │   ├── auth/                               # 인증 페이지
│   │   │   └── login/                          # 로그인 페이지
│   │   ├── development/                        # 개발/테스트 페이지
│   │   │   └── sabre-api/                      # Sabre API 테스트
│   │   ├── test-connection/                    # 연결 테스트
│   │   ├── globals.css                         # 전역 스타일
│   │   ├── layout.tsx                          # 루트 레이아웃
│   │   └── page.tsx                            # 홈 페이지
│   ├── components/                             # 재사용 가능한 컴포넌트
│   │   ├── ui/                                 # shadcn/ui 기본 컴포넌트
│   │   │   ├── button.tsx                      # Button
│   │   │   └── input.tsx                       # Input
│   │   └── shared/                             # 공통 컴포넌트
│   │       ├── app-root.tsx                    # 앱 루트
│   │       ├── app-shell.tsx                   # 앱 셸
│   │       ├── auth-guard.tsx                  # 인증 가드
│   │       ├── confirm-dialog.tsx              # 확인 다이얼로그
│   │       ├── dashboard-stats.tsx             # 대시보드 통계
│   │       ├── date-input.tsx                  # 날짜 입력
│   │       ├── field-highlight.ts              # 필드 하이라이트
│   │       ├── form-actions.tsx                # 폼 액션
│   │       ├── form-dirty.ts                   # 폼 변경 감지
│   │       ├── hotel-quick-search.tsx          # 호텔 빠른 검색
│   │       ├── hotel-search-widget.tsx         # 호텔 검색 위젯
│   │       ├── inline-create-row.tsx           # 인라인 생성 행
│   │       ├── pagination.tsx                  # 페이지네이션
│   │       ├── providers.tsx                   # TanStack Query Provider
│   │       └── sidebar.tsx                     # 사이드바
│   ├── features/                               # 도메인별 기능
│   │   ├── auth/                               # 인증 관련
│   │   │   ├── components/                     # 인증 컴포넌트
│   │   │   ├── contexts/                       # 인증 컨텍스트
│   │   │   └── hooks/                          # 인증 훅
│   │   └── hotels/                             # 호텔 관련
│   │       ├── components/                     # 호텔 컴포넌트
│   │       └── lib/                            # 호텔 라이브러리
│   ├── lib/                                    # 유틸리티 및 설정
│   │   ├── supabase/                           # Supabase 클라이언트
│   │   │   ├── client.ts                       # 브라우저 클라이언트
│   │   │   ├── middleware.ts                   # 미들웨어 클라이언트
│   │   │   └── server.ts                       # 서버 클라이언트 (Service Role)
│   │   ├── media-naming.ts                     # 이미지 파일명 생성
│   │   ├── openai-location-extractor.ts        # OpenAI 위치 정보 추출
│   │   ├── sabre.ts                            # Sabre API 유틸리티
│   │   └── utils.ts                            # 공통 유틸리티 (cn)
│   ├── services/                               # 외부 서비스 연동
│   │   └── sabre-auth.ts                       # Sabre 인증
│   └── types/                                  # TypeScript 타입 정의
│       ├── auth.ts                             # 인증 타입
│       └── hotel.ts                            # 호텔 타입
├── public/                                     # 정적 파일
│   ├── login-image/                            # 로그인 이미지
│   └── favicon.png                             # 파비콘
├── workingdocs/                                # 작업 문서
├── .env.local                                  # 환경 변수 (Git 제외)
├── components.json                             # shadcn/ui 설정
├── next.config.ts                              # Next.js 설정
├── package.json                                # 의존성 관리
├── pnpm-lock.yaml                              # pnpm 잠금 파일
├── postcss.config.mjs                          # PostCSS 설정
├── tailwind.config.ts                          # Tailwind CSS 설정
├── tsconfig.json                               # TypeScript 설정
└── vitest.config.ts                            # Vitest 설정
```

## ⚡ 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/your-org/select3-admin.git
cd select3-admin
```

### 2. 의존성 설치
```bash
pnpm install
```

### 3. 환경 변수 설정
```bash
cp .env.example .env.local
```

`.env.local` 파일에 다음 환경 변수를 설정하세요:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI API (위치 정보 추출용)
OPENAI_API_KEY=your_openai_api_key

# Sabre API (호텔 정보 조회용)
SABRE_API_BASE_URL=https://api.sabre.com
SABRE_CLIENT_ID=your_sabre_client_id
SABRE_CLIENT_SECRET=your_sabre_client_secret

# Next.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret_min_32_chars
NEXTAUTH_URL=http://localhost:3000

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

> ⚠️ **보안 주의**: `.env.local` 파일은 절대 Git에 커밋하지 마세요. 이미 `.gitignore`에 포함되어 있습니다.

### 4. 데이터베이스 설정
Supabase SQL Editor에서 `SUPABASE_TABLES.sql` 파일의 내용을 실행하세요.

### 5. 개발 서버 실행
```bash
pnpm dev
```

브라우저에서 `http://localhost:3000`으로 접속하세요.

## 🔧 환경 설정

### Supabase 설정

#### 1. 프로젝트 생성
1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 설정 → API → Project URL 및 API Keys 복사
   - `NEXT_PUBLIC_SUPABASE_URL`: Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: service_role key (⚠️ 서버 전용)

#### 2. 데이터베이스 스키마 생성
1. Supabase Dashboard → SQL Editor
2. `SUPABASE_TABLES.sql` 파일 내용 복사 및 실행
3. 주요 테이블 생성 확인:
   - `select_hotels`: 호텔 기본 정보
   - `hotel_chains`: 호텔 체인
   - `hotel_brands`: 호텔 브랜드
   - `select_hotel_benefits`: 혜택 마스터
   - `select_hotel_benefits_map`: 호텔-혜택 매핑
   - `select_hotel_promotions`: 프로모션
   - `select_hotel_promotion_map`: 호텔-프로모션 매핑

#### 3. Storage 버킷 생성
1. Supabase Dashboard → Storage
2. 새 버킷 생성: `hotel-media`
3. 버킷 설정:
   - Public: ✅ (공개 액세스)
   - File size limit: 5MB
   - Allowed MIME types: `image/*`

#### 4. Row Level Security (RLS) 설정
RLS 정책은 `SUPABASE_TABLES.sql`에 포함되어 있습니다. 필요 시 추가 정책 설정.

### OpenAI API 설정
1. [OpenAI Platform](https://platform.openai.com)에서 계정 생성
2. API Keys → Create new secret key
3. 생성된 키를 `.env.local`의 `OPENAI_API_KEY`에 추가
4. 사용 모델: `gpt-4o-mini` (위치 정보 추출용)

### Sabre API 설정
1. Sabre 개발자 계정 및 자격 증명 획득
2. Client ID 및 Client Secret 발급
3. `.env.local`에 추가:
   - `SABRE_CLIENT_ID`
   - `SABRE_CLIENT_SECRET`

### 개발 환경 요구사항
- **Node.js**: 18.17+ 또는 20.0+ (권장: 20.x LTS)
- **pnpm**: 8.0+ (권장: 최신 버전)
  ```bash
  npm install -g pnpm
  ```
- **Git**: 2.30+
- **운영체제**: Windows, macOS, Linux

## 📚 API 문서

### 응답 형식 표준
모든 API는 다음 형식을 따릅니다:

```typescript
// 성공 응답
{
  success: true,
  data: any,           // 실제 데이터
  message?: string,    // 선택적 메시지
  meta?: {             // 페이지네이션 등 메타 정보
    count?: number,
    page?: number,
    pageSize?: number
  }
}

// 오류 응답
{
  success: false,
  error: string,       // 사용자 친화적 오류 메시지
  code?: string,       // 애플리케이션 오류 코드
  details?: any        // 추가 오류 정보
}
```

### 호텔 관련 API

#### `GET /api/hotel/search`
호텔 검색 (한글명, 영문명, Sabre ID)
```typescript
// Query Parameters
{
  q: string;        // 검색어
  limit?: number;   // 결과 제한 (기본값: 50)
}

// Response
{
  success: true,
  data: Array<{
    sabre_id: string;
    property_name_ko: string;
    property_name_en: string;
    brand_id?: number;
    chain_id?: number;
  }>;
}
```

#### `GET /api/hotel/suggest`
호텔 자동완성 (검색 입력 중 실시간 제안)
```typescript
// Query Parameters
{
  q: string;        // 검색어 (최소 2자)
}

// Response
{
  success: true,
  data: Array<{
    sabre_id: string;
    property_name_ko: string;
    property_name_en: string;
  }>;
}
```

#### `POST /api/hotel/update`
호텔 정보 업데이트
```typescript
// Request Body
{
  sabre_id: string;
  property_name_ko?: string;
  property_name_en?: string;
  property_address?: string;
  city_ko?: string;
  city_en?: string;
  country_ko?: string;
  country_en?: string;
  continent_ko?: string;
  continent_en?: string;
  brand_id?: number;
  rate_plan_codes?: string[] | null;
}

// Response
{
  success: true,
  data: { sabre_id: string, message: string };
}
```

### 이미지 관리 API

#### `GET /api/hotel-images/list`
호텔 이미지 목록 조회 (Supabase Storage 기반)
```typescript
// Query Parameters
{
  sabreId: string;
}

// Response
{
  success: true,
  data: {
    images: Array<{
      name: string;
      url: string;
      seq: number;
      role: 'original' | 'public';
      size: number;
      createdAt: string;
      path: string;
    }>;
  };
}
```

#### `POST /api/hotel-images/upload`
이미지 업로드
```typescript
// FormData
{
  sabreId: string;
  file: File;
}

// Response
{
  success: true,
  data: { filePath: string };
  message: string;
}
```

#### `DELETE /api/hotel-images/delete`
이미지 삭제
```typescript
// Query Parameters
{
  filePath: string;
}

// Response
{
  success: true,
  message: string;
}
```

#### `POST /api/hotel-images/bulk/migrate-selected`
선택 호텔 이미지 일괄 마이그레이션
```typescript
// Request Body
{
  sabreIds: string[];
}

// Response
{
  success: true,
  data: {
    statistics: {
      totalHotels: number;
      processedHotels: number;
      successfulMigrations: number;
      failedMigrations: number;
      skippedHotels: number;
    };
    errors: string[];
    failedHotels: Array<{
      sabre_id: string;
      name_ko: string;
      name_en: string;
      error: string;
    }>;
  };
}
```

### 위치 정보 추출 API (OpenAI)

#### `POST /api/data-migration/extract-location`
단일 호텔 주소에서 위치 정보 추출
```typescript
// Request Body
{
  address: string;
}

// Response
{
  success: true,
  data: {
    city_ko: string;
    city_en: string;
    country_ko: string;
    country_en: string;
    continent_ko: string;
    continent_en: string;
  };
}
```

#### `GET /api/data-migration/bulk-location-migration`
전체 호텔 위치 정보 일괄 마이그레이션 (SSE 스트림)
```typescript
// Response (Server-Sent Events)
data: {"type":"progress","current":1,"total":100,"hotel":"호텔명"}
data: {"type":"success","current":1,"total":100}
data: {"type":"error","current":1,"total":100,"error":"오류 메시지"}
data: {"type":"complete","processed":100,"successful":95,"failed":5}
```

### 체인/브랜드 관련 API

#### `GET /api/chain-brand/list`
체인/브랜드 목록 조회
```typescript
// Response
{
  success: true,
  data: {
    chains: Array<{
      chain_id: number;
      chain_name_kr: string;
      chain_name_en: string;
      slug: string;
    }>;
    brands: Array<{
      brand_id: number;
      brand_name_kr: string;
      brand_name_en: string;
      chain_id: number;
    }>;
  };
}
```

#### `POST /api/chain-brand/chain/create`
새 체인 생성
```typescript
// FormData
{
  name_kr: string;
  name_en: string;
  slug: string;
}

// Response
{
  success: true,
  data: { chain_id: number };
}
```

### 혜택 관련 API

#### `GET /api/benefits/list`
혜택 목록 조회
```typescript
// Response
{
  success: true,
  data: Array<{
    benefit_id: number;
    name_kr: string;
    name_en: string;
    description_kr: string;
    description_en: string;
  }>;
}
```

### 프로모션 관련 API

#### `POST /api/promotions/create`
프로모션 생성/수정 (Upsert)
```typescript
// Request Body
{
  promotion_id?: number;  // 있으면 업데이트, 없으면 생성
  promotion_name: string;
  promotion_description?: string;
  booking_start_date?: string;  // YYYY-MM-DD
  booking_end_date?: string;
  check_in_start_date?: string;
  check_in_end_date?: string;
  note?: string;
}

// Response
{
  success: true,
  data: { promotion_id: number };
}
```

## 🗄 데이터베이스 스키마

### 주요 테이블

#### `select_hotels` (호텔 정보)
```sql
CREATE TABLE select_hotels (
  sabre_id VARCHAR PRIMARY KEY,
  paragon_id VARCHAR,
  property_name_ko VARCHAR,
  property_name_en VARCHAR,
  property_address TEXT,
  city_ko VARCHAR,
  city_en VARCHAR,
  country_ko VARCHAR,
  country_en VARCHAR,
  continent_ko VARCHAR,
  continent_en VARCHAR,
  brand_id INTEGER REFERENCES hotel_brands(brand_id),
  slug VARCHAR,
  image_1 TEXT,
  image_2 TEXT,
  image_3 TEXT,
  image_4 TEXT,
  image_5 TEXT,
  property_details TEXT,
  property_location TEXT,
  rate_plan_codes TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `hotel_chains` (호텔 체인)
```sql
CREATE TABLE hotel_chains (
  chain_id SERIAL PRIMARY KEY,
  chain_name_kr VARCHAR NOT NULL,
  chain_name_en VARCHAR NOT NULL,
  slug VARCHAR UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `hotel_brands` (호텔 브랜드)
```sql
CREATE TABLE hotel_brands (
  brand_id SERIAL PRIMARY KEY,
  brand_name_kr VARCHAR NOT NULL,
  brand_name_en VARCHAR NOT NULL,
  chain_id INTEGER REFERENCES hotel_chains(chain_id),
  slug VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `select_hotel_benefits` (혜택 마스터)
```sql
CREATE TABLE select_hotel_benefits (
  benefit_id SERIAL PRIMARY KEY,
  name_kr VARCHAR NOT NULL,
  name_en VARCHAR,
  description_kr TEXT,
  description_en TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `select_hotel_benefits_map` (호텔-혜택 매핑)
```sql
CREATE TABLE select_hotel_benefits_map (
  sabre_id VARCHAR REFERENCES select_hotels(sabre_id) ON DELETE CASCADE,
  benefit_id INTEGER REFERENCES select_hotel_benefits(benefit_id) ON DELETE CASCADE,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (sabre_id, benefit_id)
);
```

#### `select_hotel_promotions` (프로모션)
```sql
CREATE TABLE select_hotel_promotions (
  promotion_id SERIAL PRIMARY KEY,
  promotion_name VARCHAR NOT NULL,
  promotion_description TEXT,
  booking_start_date DATE,
  booking_end_date DATE,
  check_in_start_date DATE,
  check_in_end_date DATE,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `select_hotel_promotion_map` (호텔-프로모션 매핑)
```sql
CREATE TABLE select_hotel_promotion_map (
  promotion_id INTEGER REFERENCES select_hotel_promotions(promotion_id) ON DELETE CASCADE,
  sabre_id VARCHAR REFERENCES select_hotels(sabre_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (promotion_id, sabre_id)
);
```

### 관계도
```
hotel_chains (1) ──< (N) hotel_brands
hotel_brands (1) ──< (N) select_hotels
select_hotels (N) ──< (N) select_hotel_benefits (through select_hotel_benefits_map)
select_hotels (N) ──< (N) select_hotel_promotions (through select_hotel_promotion_map)
```

## 👨‍💻 개발 가이드

### 코드 스타일 및 규칙
- **TypeScript**: Strict 모드, `any` 사용 금지
- **ESLint**: Next.js 권장 설정 + 커스텀 규칙
- **Prettier**: 자동 코드 포맷팅 (저장 시 적용)
- **Conventional Commits**: 표준 커밋 메시지 형식 필수
  ```
  feat(scope): 새로운 기능 추가
  fix(scope): 버그 수정
  refactor(scope): 코드 리팩토링
  docs(scope): 문서 업데이트
  chore(scope): 빌드/설정 변경
  ```

### 디렉토리 규칙
- `src/app/`: 페이지 및 API 라우트 (Next.js App Router)
- `src/components/ui/`: shadcn/ui 기본 컴포넌트
- `src/components/shared/`: 재사용 공통 컴포넌트
- `src/features/`: 도메인별 기능 모듈
- `src/lib/`: 유틸리티, Supabase 클라이언트, 외부 서비스 연동
- `src/types/`: 전역 TypeScript 타입 정의

### 컴포넌트 개발 가이드
```typescript
'use client'; // 클라이언트 컴포넌트인 경우에만

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ComponentProps {
  title: string;
  variant?: 'default' | 'primary';
  onAction?: () => void;
  className?: string;
}

export default function Component({ 
  title, 
  variant = 'default',
  onAction,
  className 
}: ComponentProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!onAction) return;
    setIsLoading(true);
    try {
      await onAction();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('p-4 rounded-lg', className)}>
      <h1 className="text-xl font-bold">{title}</h1>
      <Button 
        onClick={handleClick}
        disabled={isLoading}
        variant={variant === 'primary' ? 'default' : 'outline'}
      >
        {isLoading ? '처리 중...' : '액션'}
      </Button>
    </div>
  );
}
```

### API 라우트 개발 가이드
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Query params 추출
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID는 필수입니다.'
      }, { status: 400 });
    }

    // Supabase 클라이언트 생성 (Service Role)
    const supabase = createServiceRoleClient();
    
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('데이터 조회 오류:', error);
      return NextResponse.json({
        success: false,
        error: '데이터를 찾을 수 없습니다.'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 유효성 검사
    if (!body.name || !body.email) {
      return NextResponse.json({
        success: false,
        error: '필수 필드가 누락되었습니다.'
      }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    
    const { data, error } = await supabase
      .from('table_name')
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error('데이터 삽입 오류:', error);
      return NextResponse.json({
        success: false,
        error: '데이터 생성에 실패했습니다.'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data
    }, { status: 201 });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
```

### TanStack Query 사용 가이드
```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query Hook
export function useHotels(searchQuery: string) {
  return useQuery({
    queryKey: ['hotels', searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/hotel/search?q=${searchQuery}`);
      if (!res.ok) throw new Error('검색 실패');
      return res.json();
    },
    enabled: searchQuery.length >= 2, // 2자 이상일 때만 실행
    staleTime: 1000 * 60, // 1분간 캐시 유지
  });
}

// Mutation Hook
export function useUpdateHotel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: HotelUpdateData) => {
      const res = await fetch('/api/hotel/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('업데이트 실패');
      return res.json();
    },
    onSuccess: () => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
    },
  });
}
```

### 테스트
```bash
# 단위 테스트 실행
pnpm test

# Watch 모드
pnpm test:watch

# 테스트 커버리지 확인
pnpm test:coverage

# 린트 검사
pnpm lint

# 타입 검사
pnpm type-check
```

### 빌드 및 최적화
```bash
# 개발 서버
pnpm dev

# 프로덕션 빌드
pnpm build

# 프로덕션 미리보기
pnpm start

# 빌드 분석
pnpm build && pnpm analyze
```

## 🚀 배포

### Vercel 배포 (권장)

#### 1. GitHub 연동
1. [Vercel](https://vercel.com) 계정 생성/로그인
2. "New Project" → GitHub 저장소 선택
3. Framework Preset: Next.js (자동 감지)
4. Root Directory: `./` (루트)

#### 2. 환경 변수 설정
Vercel Dashboard → Project Settings → Environment Variables에서 다음 변수 추가:

```env
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_supabase_service_role_key

# OpenAI (Production)
OPENAI_API_KEY=your_openai_api_key

# Sabre (Production)
SABRE_API_BASE_URL=https://api.sabre.com
SABRE_CLIENT_ID=your_production_sabre_client_id
SABRE_CLIENT_SECRET=your_production_sabre_client_secret

# Next.js (Production)
NEXTAUTH_SECRET=your_production_nextauth_secret_min_32_chars
NEXTAUTH_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
```

#### 3. 배포 트리거
- `main` 브랜치에 push하면 자동 배포
- Pull Request 생성 시 프리뷰 배포 자동 생성

#### 4. 도메인 설정
- Vercel Dashboard → Domains → Add Domain
- 커스텀 도메인 연결 및 SSL 자동 설정

### 로컬 프로덕션 빌드 테스트
```bash
# 프로덕션 빌드
pnpm build

# 빌드 결과물 확인
ls -la .next/

# 로컬에서 프로덕션 모드 실행
pnpm start
```

### 성능 최적화 체크리스트
- [ ] 이미지 최적화: `next/image` 사용 확인
- [ ] 코드 스플리팅: 동적 import 적용
- [ ] 캐싱 전략: TanStack Query staleTime 설정
- [ ] API 응답 최적화: 불필요한 데이터 제거
- [ ] Lighthouse 점수: 90점 이상 목표

## 🤝 기여하기

프로젝트 기여를 환영합니다! 다음 절차를 따라주세요.

### 기여 절차
1. **Fork**: 이 저장소를 Fork합니다.
2. **Clone**: 로컬에 Clone합니다.
   ```bash
   git clone https://github.com/YOUR_USERNAME/select3-admin.git
   cd select3-admin
   ```
3. **Branch**: 기능 브랜치를 생성합니다.
   ```bash
   git checkout -b feature/amazing-feature
   ```
4. **Develop**: 코드를 작성하고 테스트합니다.
   ```bash
   pnpm dev
   pnpm lint
   pnpm type-check
   ```
5. **Commit**: Conventional Commits 규칙에 따라 커밋합니다.
   ```bash
   git commit -m "feat(hotels): add AI-based location extraction"
   ```
6. **Push**: 브랜치를 푸시합니다.
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Pull Request**: GitHub에서 PR을 생성합니다.

### PR 체크리스트
- [ ] Conventional Commits 형식 준수
- [ ] `pnpm lint` 통과
- [ ] `pnpm type-check` 통과
- [ ] `pnpm build` 성공
- [ ] 변경 사항에 대한 명확한 설명
- [ ] 스크린샷/영상 (UI 변경 시)
- [ ] 관련 이슈 번호 참조 (있는 경우)

### 개발 워크플로우
1. **이슈 확인**: 기존 이슈를 확인하거나 새 이슈를 생성합니다.
2. **브랜치 생성**: `feature/`, `fix/`, `refactor/` 등 접두사를 사용합니다.
3. **개발**: 코드 스타일 가이드를 준수하며 개발합니다.
4. **테스트**: 로컬에서 충분히 테스트합니다.
5. **PR 생성**: 명확한 제목과 설명을 작성합니다.
6. **리뷰 대응**: 리뷰 코멘트에 성실히 응답합니다.
7. **Merge**: 승인 후 main 브랜치에 병합됩니다.

## 📝 라이선스

이 프로젝트는 **MIT 라이선스** 하에 배포됩니다.  
자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

## 📞 지원 및 문의

- **이슈 리포트**: [GitHub Issues](https://github.com/Dev-Expertise-TS/select3-admin/issues)
- **기능 요청**: [GitHub Discussions](https://github.com/Dev-Expertise-TS/select3-admin/discussions)
- **보안 취약점**: security@select3.com (비공개 보고)

## 📊 프로젝트 현황

- **언어**: TypeScript 95%, CSS 3%, JavaScript 2%
- **라인 수**: ~50,000 LOC
- **주요 기능**: 15개 모듈
- **API 엔드포인트**: 30+ 개
- **테스트 커버리지**: 목표 80%+

## 🙏 감사의 말

이 프로젝트는 다음 오픈소스 프로젝트와 커뮤니티의 도움으로 만들어졌습니다:

### 핵심 프레임워크
- [Next.js](https://nextjs.org/) - React 기반 풀스택 프레임워크
- [Supabase](https://supabase.com/) - 오픈소스 Firebase 대안
- [Tailwind CSS](https://tailwindcss.com/) - 유틸리티 우선 CSS 프레임워크

### UI/UX
- [shadcn/ui](https://ui.shadcn.com/) - 재사용 가능한 컴포넌트 라이브러리
- [Radix UI](https://www.radix-ui.com/) - 접근성 우선 UI 프리미티브
- [Lucide Icons](https://lucide.dev/) - 아이콘 라이브러리

### 상태 관리 및 데이터
- [TanStack Query](https://tanstack.com/query) - 강력한 비동기 상태 관리
- [React Hook Form](https://react-hook-form.com/) - 고성능 폼 라이브러리

### AI 및 외부 서비스
- [OpenAI](https://openai.com/) - GPT 기반 위치 정보 추출
- [Sabre](https://www.sabre.com/) - 호텔 정보 및 Rate Plan API

### 개발 도구
- [TypeScript](https://www.typescriptlang.org/) - 타입 안전성
- [ESLint](https://eslint.org/) - 코드 품질 검사
- [Prettier](https://prettier.io/) - 코드 포맷팅
- [Vitest](https://vitest.dev/) - 빠른 단위 테스트

---

<div align="center">

**Select3 Admin** - 프리미엄 호텔 관리의 새로운 표준 🏨✨

Made with ❤️ by [Dev Expertise TS](https://github.com/Dev-Expertise-TS)

</div>