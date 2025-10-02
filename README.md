# Select3 Admin - 호텔 관리 시스템

Select3 Admin은 프리미엄 호텔과 리조트를 위한 통합 관리 시스템입니다. Next.js 15, TypeScript, Supabase를 기반으로 구축되었으며, 호텔 정보 관리, 체인/브랜드 연결, 혜택 관리 등의 기능을 제공합니다.

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

### 1. 호텔 관리
- **호텔 검색 및 필터링**: 한글명, 영문명, Sabre ID로 검색
- **호텔 정보 관리**: 기본 정보, 이미지, Rate Plan Code 관리
- **실시간 데이터 동기화**: Supabase와 실시간 연동

### 2. 체인/브랜드 관리
- **체인 관리**: 호텔 체인 정보 CRUD 작업
- **브랜드 관리**: 호텔 브랜드 정보 관리
- **호텔 연결**: 호텔을 특정 체인/브랜드에 연결
- **실시간 연결 상태 표시**: 연결 후 즉시 UI 반영

### 3. 혜택 관리
- **혜택 카탈로그**: 마스터 혜택 정보 관리
- **호텔별 혜택 매핑**: 호텔과 혜택 간 연결 관리
- **드래그 앤 드롭**: 혜택 순서 조정

### 4. 데이터 마이그레이션
- **CSV 가져오기/내보내기**: 대량 데이터 처리
- **배치 업데이트**: 효율적인 데이터 동기화
- **데이터 검증**: 입력 데이터 유효성 검사

### 5. 사용자 관리
- **인증 시스템**: 로그인/로그아웃 기능
- **사용자 활동 추적**: 사용자 행동 로그
- **권한 관리**: 역할 기반 접근 제어

## 📁 프로젝트 구조

```
src/
├── app/                          # Next.js App Router
│   ├── admin/                    # 관리자 페이지
│   │   ├── chain-brand/          # 체인/브랜드 관리
│   │   ├── hotel-details/        # 호텔 상세 정보
│   │   ├── hotel-search/         # 호텔 검색
│   │   ├── hotel-update/         # 호텔 정보 수정
│   │   ├── benefits/             # 혜택 관리
│   │   └── data-migration/       # 데이터 마이그레이션
│   ├── api/                      # API 라우트
│   │   ├── hotel/                # 호텔 관련 API
│   │   ├── chain-brand/          # 체인/브랜드 API
│   │   ├── benefits/             # 혜택 API
│   │   └── auth/                 # 인증 API
│   └── auth/                     # 인증 페이지
├── components/                   # 재사용 가능한 컴포넌트
│   ├── ui/                       # shadcn/ui 컴포넌트
│   └── shared/                   # 공통 컴포넌트
├── features/                     # 도메인별 기능
│   ├── auth/                     # 인증 관련
│   └── hotels/                   # 호텔 관련
├── lib/                          # 유틸리티 및 설정
│   ├── supabase/                 # Supabase 클라이언트
│   └── utils.ts                  # 공통 유틸리티
├── types/                        # TypeScript 타입 정의
└── hooks/                        # 커스텀 훅
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
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Next.js
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 4. 데이터베이스 설정
Supabase SQL Editor에서 `SUPABASE_TABLES.sql` 파일의 내용을 실행하세요.

### 5. 개발 서버 실행
```bash
pnpm dev
```

브라우저에서 `http://localhost:3000`으로 접속하세요.

## 🔧 환경 설정

### Supabase 설정
1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 설정에서 API 키 복사
3. 데이터베이스 테이블 생성 (`SUPABASE_TABLES.sql` 실행)
4. Row Level Security (RLS) 정책 설정

### 개발 환경
- Node.js 18+ 필요
- pnpm 8+ 권장
- Git 2.30+ 필요

## 📚 API 문서

### 호텔 관련 API

#### `GET /api/hotel/search`
호텔 검색
```typescript
// Query Parameters
{
  q: string;        // 검색어 (한글명, 영문명, Sabre ID)
  limit?: number;   // 결과 제한 (기본값: 50)
}

// Response
{
  success: boolean;
  data: HotelSearchResult[];
  count: number;
}
```

#### `POST /api/hotel/connect-chain-brand`
호텔을 체인/브랜드에 연결
```typescript
// Request Body
{
  sabre_id: string;
  chain_id: number;
  brand_id: number;
}

// Response
{
  success: boolean;
  data: {
    sabre_id: string;
    chain_id: number;
    brand_id: number;
    message: string;
  };
}
```

### 체인/브랜드 관련 API

#### `GET /api/chain-brand/list`
체인/브랜드 목록 조회
```typescript
// Response
{
  success: boolean;
  data: {
    chains: Chain[];
    brands: Brand[];
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
```

## 🗄 데이터베이스 스키마

### 주요 테이블

#### `select_hotels`
```sql
CREATE TABLE select_hotels (
  sabre_id VARCHAR PRIMARY KEY,
  paragon_id VARCHAR,
  property_name_ko VARCHAR,
  property_name_en VARCHAR,
  brand_id INTEGER REFERENCES hotel_brands(brand_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `hotel_chains`
```sql
CREATE TABLE hotel_chains (
  chain_id SERIAL PRIMARY KEY,
  chain_name_kr VARCHAR,
  chain_name_en VARCHAR,
  slug VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `hotel_brands`
```sql
CREATE TABLE hotel_brands (
  brand_id SERIAL PRIMARY KEY,
  brand_name_kr VARCHAR,
  brand_name_en VARCHAR,
  chain_id INTEGER REFERENCES hotel_chains(chain_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `select_hotel_benefits`
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

## 👨‍💻 개발 가이드

### 코드 스타일
- **TypeScript**: 엄격한 타입 검사 사용
- **ESLint**: Airbnb 스타일 가이드 준수
- **Prettier**: 자동 코드 포맷팅
- **Conventional Commits**: 표준 커밋 메시지 형식

### 컴포넌트 개발
```typescript
// 컴포넌트 Props 타입 정의
interface ComponentProps {
  title: string;
  onAction?: () => void;
}

// 컴포넌트 구현
export default function Component({ title, onAction }: ComponentProps) {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">{title}</h1>
      {onAction && (
        <button onClick={onAction}>액션</button>
      )}
    </div>
  );
}
```

### API 개발
```typescript
// API 라우트 예시
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('table_name')
      .select('*');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
```

### 테스트
```bash
# 단위 테스트 실행
pnpm test

# 테스트 커버리지 확인
pnpm test:coverage
```

## 🚀 배포

### Vercel 배포
1. GitHub 저장소와 Vercel 연결
2. 환경 변수 설정
3. 자동 배포 설정

### 환경 변수 설정
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_supabase_service_role_key
NEXTAUTH_SECRET=your_production_nextauth_secret
NEXTAUTH_URL=https://your-domain.vercel.app
```

### 빌드 최적화
```bash
# 프로덕션 빌드
pnpm build

# 빌드 분석
pnpm build:analyze
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 개발 워크플로우
1. 이슈 생성 또는 기존 이슈 선택
2. 기능 브랜치 생성
3. 개발 및 테스트
4. PR 생성 및 리뷰 요청
5. 코드 리뷰 후 머지

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 지원

- **이슈 리포트**: [GitHub Issues](https://github.com/your-org/select3-admin/issues)
- **문서**: [Wiki](https://github.com/your-org/select3-admin/wiki)
- **이메일**: support@select3.com

## 🙏 감사의 말

이 프로젝트는 다음 오픈소스 프로젝트들의 도움을 받아 개발되었습니다:

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

---

**Select3 Admin** - 프리미엄 호텔 관리의 새로운 표준 🏨✨