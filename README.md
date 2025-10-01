# Select3 Admin - 호텔 관리 시스템

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=for-the-badge&logo=supabase)

**현대적이고 확장 가능한 호텔 관리 시스템**

[🚀 시작하기](#-시작하기) • [📖 문서](#-문서) • [🛠 기술 스택](#️-기술-스택) • [🤝 기여하기](#-기여하기)

</div>

---

## 📋 목차

- [🎯 프로젝트 개요](#-프로젝트-개요)
- [✨ 주요 기능](#-주요-기능)
- [🛠 기술 스택](#️-기술-스택)
- [🚀 시작하기](#-시작하기)
- [🗄 데이터베이스 설정](#-데이터베이스-설정)
- [📁 프로젝트 구조](#-프로젝트-구조)
- [🔧 개발 가이드](#-개발-가이드)
- [🧪 테스트](#-테스트)
- [🚀 배포](#-배포)
- [📚 API 문서](#-api-문서)
- [🤝 기여하기](#-기여하기)
- [📄 라이선스](#-라이선스)

---

## 🎯 프로젝트 개요

Select3 Admin은 호텔 체인과 브랜드를 체계적으로 관리할 수 있는 웹 기반 관리 시스템입니다. 현대적인 웹 기술을 활용하여 직관적이고 효율적인 호텔 관리 경험을 제공합니다.

### 🎨 핵심 특징

- **🔄 실시간 데이터 관리**: 실시간 CRUD 작업 및 즉시 피드백
- **📱 반응형 디자인**: 모든 디바이스에서 최적화된 사용자 경험
- **🔒 보안**: Supabase Auth 기반 안전한 인증 시스템
- **⚡ 성능**: Next.js 15와 최신 웹 기술로 최적화된 성능
- **🎯 타입 안전성**: TypeScript로 완전한 타입 안전성 보장

---

## ✨ 주요 기능

### 🏨 호텔 관리
- **호텔 정보 조회**: Sabre ID 기반 호텔 검색 및 상세 정보 조회
- **호텔 정보 수정**: 호텔 기본 정보, 이미지, 요금 코드 관리
- **혜택 매핑**: 호텔별 혜택 설정 및 드래그 앤 드롭 정렬

### 🏢 체인 & 브랜드 관리
- **체인 관리**: 호텔 체인 정보 CRUD (한글명, 영문명, Slug)
- **브랜드 관리**: 체인별 브랜드 정보 CRUD (한글명, 영문명, Slug)
- **관계 설정**: 체인-브랜드 관계 설정 및 관리

### 🎁 혜택 관리
- **혜택 마스터**: 호텔 혜택 카탈로그 관리
- **혜택 매핑**: 호텔별 혜택 연결 및 정렬 관리
- **시각적 편집**: 드래그 앤 드롭으로 직관적인 혜택 정렬

### 👥 사용자 관리
- **관리자 계정**: 사용자 계정 생성, 수정, 삭제
- **권한 관리**: 역할 기반 접근 제어
- **활동 로그**: 사용자 활동 추적 및 모니터링

### 📢 콘텐츠 관리
- **광고 관리**: 배너, 프로모션, 히어로 캐러셀 관리
- **호텔 아티클**: 호텔 관련 콘텐츠 및 블로그 관리
- **이미지 관리**: 호텔 이미지 업로드 및 관리

### 🔌 외부 API 연동
- **Sabre API**: 호텔 정보 및 요금 데이터 연동
- **데이터 마이그레이션**: CSV 파일 기반 대량 데이터 처리

---

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **State Management**: React Query (TanStack Query)
- **Icons**: Lucide React

### Backend
- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage

### Development Tools
- **Package Manager**: pnpm
- **Linting**: ESLint
- **Testing**: Vitest + Testing Library
- **Type Checking**: TypeScript strict mode

### External Services
- **Sabre API**: 호텔 및 요금 정보
- **Supabase**: 데이터베이스 및 인증

---

## 🚀 시작하기

### 📋 요구사항

- **Node.js**: 18.18+ 
- **pnpm**: 9.0+
- **Supabase**: 계정 및 프로젝트
- **Sabre API**: 계정 (선택사항)

### 1️⃣ 저장소 클론

```bash
git clone https://github.com/[your-username]/select3-admin.git
cd select3-admin
```

### 2️⃣ 의존성 설치

```bash
pnpm install
```

### 3️⃣ 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Sabre API 설정 (선택사항)
SABRE_CLIENT_ID=your_sabre_client_id
SABRE_CLIENT_SECRET=your_sabre_client_secret

# Next.js 설정
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 4️⃣ 데이터베이스 설정

Supabase SQL Editor에서 `SUPABASE_TABLES.sql` 파일의 내용을 실행하여 필요한 테이블들을 생성하세요.

### 5️⃣ 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 6️⃣ 프로덕션 빌드

```bash
# 빌드
pnpm build

# 프로덕션 서버 실행
pnpm start
```

---

## 🗄 데이터베이스 설정

### 📊 주요 테이블

#### 호텔 관련
- `select_hotels` - 호텔 기본 정보
- `select_hotel_benefits` - 혜택 마스터 데이터
- `select_hotel_benefits_map` - 호텔-혜택 매핑

#### 체인 & 브랜드
- `hotel_chains` - 호텔 체인 정보
- `hotel_brands` - 호텔 브랜드 정보

#### 사용자 & 인증
- `users` - 사용자 계정 정보
- `user_activity` - 사용자 활동 로그

### 🔧 데이터베이스 초기화

```sql
-- Supabase SQL Editor에서 실행
-- 1. 체인 & 브랜드 테이블 생성
CREATE TABLE IF NOT EXISTS hotel_chains (
  chain_id SERIAL PRIMARY KEY,
  name_kr VARCHAR(255),
  name_en VARCHAR(255),
  slug VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hotel_brands (
  brand_id SERIAL PRIMARY KEY,
  name_kr VARCHAR(255),
  name_en VARCHAR(255),
  slug VARCHAR(255),
  chain_id INTEGER REFERENCES hotel_chains(chain_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 업데이트 트리거 설정
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. 트리거 적용
CREATE TRIGGER update_hotel_chains_updated_at 
  BEFORE UPDATE ON hotel_chains 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

자세한 스키마는 `SUPABASE_TABLES.sql` 파일을 참조하세요.

---

## 📁 프로젝트 구조

```
src/
├── app/                          # Next.js App Router
│   ├── admin/                   # 관리자 페이지
│   │   ├── advertisements/      # 광고 관리
│   │   ├── benefits/           # 혜택 관리
│   │   ├── chain-brand/        # 체인 & 브랜드 관리
│   │   ├── hotel-articles/     # 호텔 아티클 관리
│   │   ├── hotel-content/      # 호텔 콘텐츠 관리
│   │   ├── hotel-details/      # 호텔 상세 정보
│   │   ├── hotel-images/       # 호텔 이미지 관리
│   │   ├── hotel-search/       # 호텔 검색
│   │   ├── hotel-update/       # 호텔 정보 수정
│   │   ├── membership/         # 멤버십 관리
│   │   ├── promotions/         # 프로모션 관리
│   │   ├── sabre-id/           # Sabre ID 관리
│   │   ├── sabre-rates/        # Sabre 요금 관리
│   │   └── users/              # 사용자 관리
│   ├── api/                    # API 라우트
│   │   ├── auth/               # 인증 API
│   │   ├── benefits/           # 혜택 API
│   │   ├── chain-brand/        # 체인 & 브랜드 API
│   │   ├── hotel/              # 호텔 API
│   │   ├── sabre/              # Sabre API 연동
│   │   └── users/              # 사용자 API
│   ├── auth/                   # 인증 페이지
│   └── globals.css             # 전역 스타일
├── components/                  # UI 컴포넌트
│   ├── shared/                 # 공통 컴포넌트
│   │   ├── app-shell.tsx       # 앱 레이아웃
│   │   ├── auth-guard.tsx      # 인증 가드
│   │   ├── data-table.tsx      # 데이터 테이블
│   │   ├── hotel-search-widget.tsx
│   │   └── ...
│   └── ui/                     # shadcn/ui 컴포넌트
│       ├── button.tsx
│       ├── input.tsx
│       └── ...
├── features/                    # 도메인별 기능
│   ├── auth/                   # 인증 기능
│   └── hotels/                 # 호텔 관련 기능
├── lib/                         # 유틸리티 및 설정
│   ├── supabase/               # Supabase 클라이언트
│   ├── utils.ts                # 공통 유틸리티
│   └── ...
├── types/                       # TypeScript 타입 정의
│   ├── api.ts                  # API 타입
│   ├── auth.ts                 # 인증 타입
│   ├── chain-brand.ts          # 체인 & 브랜드 타입
│   ├── hotel.ts                # 호텔 타입
│   └── ...
└── hooks/                       # 커스텀 훅
    ├── use-async-state.ts
    └── use-form.ts
```

---

## 🔧 개발 가이드

### 📝 코드 스타일

#### TypeScript
- **Strict 모드** 사용
- `any` 타입 사용 금지, `unknown` + 타입 가드 사용
- 모든 함수와 변수에 명시적 타입 지정
- 사용하지 않는 변수는 `_` 접두사 사용

```typescript
// ✅ 좋은 예
const handleSubmit = async (data: FormData): Promise<void> => {
  // ...
}

// ❌ 나쁜 예
const handleSubmit = async (data: any) => {
  // ...
}
```

#### React 컴포넌트
- **Server Components** 우선 사용
- 클라이언트 컴포넌트는 필요시에만 `'use client'` 사용
- Props 타입은 `ComponentNameProps` 형식으로 정의

```typescript
// ✅ 좋은 예
interface ButtonProps {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
}

export function Button({ variant = 'primary', children }: ButtonProps) {
  // ...
}
```

#### 스타일링
- **Tailwind CSS** 클래스는 `cn()` 유틸리티로 조합
- 인라인 스타일 사용 금지
- 일관된 spacing과 color 사용

```typescript
// ✅ 좋은 예
const buttonClass = cn(
  "px-4 py-2 rounded-md font-medium",
  variant === 'primary' && "bg-blue-600 text-white",
  variant === 'secondary' && "bg-gray-200 text-gray-900"
)
```

### 🏗 아키텍처 패턴

#### App Router 패턴
- **Server Actions** 우선 사용
- API Routes는 외부 시스템 연동시에만 사용
- 데이터 페칭은 서버 컴포넌트에서 처리

#### 상태 관리
- **로컬 상태**: React `useState`, `useReducer`
- **서버 상태**: TanStack Query
- **전역 상태**: React Context (필요시에만)

#### 에러 처리
- **API 응답**: 일관된 형식 `{ success: boolean, data?: any, error?: string }`
- **클라이언트**: Error Boundary + 사용자 친화적 메시지
- **로깅**: 개발 환경에서만 상세 로그

### 🔄 Git 워크플로우

#### Conventional Commits
```bash
# 기능 추가
git commit -m "feat(ui): add slug column to chain brand table"

# 버그 수정
git commit -m "fix(api): resolve hotel search pagination issue"

# 리팩토링
git commit -m "refactor(components): extract reusable hotel card component"

# 문서 업데이트
git commit -m "docs(readme): add detailed setup instructions"
```

#### 브랜치 전략
```bash
# 기능 개발
git checkout -b feature/hotel-benefits-management

# 버그 수정
git checkout -b fix/chain-brand-crud-error

# 핫픽스
git checkout -b hotfix/critical-security-patch
```

---

## 🧪 테스트

### 🏃‍♂️ 테스트 실행

```bash
# 모든 테스트 실행
pnpm test

# 감시 모드로 테스트 실행
pnpm test:watch

# UI 모드로 테스트 실행
pnpm test:ui

# 커버리지와 함께 실행
pnpm test --coverage
```

### 📝 테스트 작성

#### 컴포넌트 테스트
```typescript
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('applies variant styles correctly', () => {
    render(<Button variant="primary">Primary Button</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600')
  })
})
```

#### API 테스트
```typescript
import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/hotel/search/route'

describe('/api/hotel/search', () => {
  it('returns hotels for valid search', async () => {
    const request = new Request('http://localhost:3000/api/hotel/search?q=서울')
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })
})
```

---

## 🚀 배포

### 🌐 Vercel 배포 (권장)

1. **Vercel 계정 연결**
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **프로젝트 배포**
   ```bash
   vercel --prod
   ```

3. **환경 변수 설정**
   - Vercel Dashboard → Project Settings → Environment Variables
   - 개발/스테이징/프로덕션 환경별 변수 설정

4. **자동 배포 설정**
   - GitHub 연동
   - main 브랜치 푸시시 자동 배포
   - Pull Request별 프리뷰 배포

### 🐳 Docker 배포

```dockerfile
# Dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g pnpm && pnpm build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

```bash
# Docker 이미지 빌드
docker build -t select3-admin .

# Docker 컨테이너 실행
docker run -p 3000:3000 select3-admin
```

### ☁️ 다른 클라우드 플랫폼

#### AWS Amplify
```bash
# Amplify CLI 설치
npm install -g @aws-amplify/cli

# 프로젝트 초기화
amplify init

# 배포
amplify publish
```

#### Netlify
```bash
# Netlify CLI 설치
npm install -g netlify-cli

# 배포
netlify deploy --prod
```

---

## 📚 API 문서

### 🔐 인증 API

#### POST `/api/auth/login`
사용자 로그인

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "admin"
    },
    "session": {
      "access_token": "jwt_token",
      "expires_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

### 🏨 호텔 API

#### GET `/api/hotel/search`
호텔 검색

**Query Parameters:**
- `q`: 검색어 (호텔명, Sabre ID)
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sabre_id": "313016",
      "name_kr": "신세계 호텔",
      "name_en": "Shinsegae Hotel",
      "address": "서울특별시 중구",
      "chain_id": 1,
      "brand_id": 1
    }
  ],
  "meta": {
    "count": 150,
    "page": 1,
    "pageSize": 20
  }
}
```

### 🏢 체인 & 브랜드 API

#### GET `/api/chain-brand/list`
체인과 브랜드 목록 조회

**Response:**
```json
{
  "success": true,
  "data": {
    "chains": [
      {
        "chain_id": 1,
        "name_kr": "신세계 호텔앤리조트",
        "name_en": "Shinsegae Hotel & Resort",
        "slug": "shinsegae"
      }
    ],
    "brands": [
      {
        "brand_id": 1,
        "name_kr": "신세계 호텔",
        "name_en": "Shinsegae Hotel",
        "slug": "shinsegae-hotel",
        "chain_id": 1
      }
    ]
  }
}
```

#### POST `/api/chain-brand/chain/create`
체인 생성

**Request Body:**
```json
{
  "name_kr": "신세계 호텔앤리조트",
  "name_en": "Shinsegae Hotel & Resort",
  "slug": "shinsegae"
}
```

### 🎁 혜택 API

#### GET `/api/benefits/list`
혜택 목록 조회

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "benefit_id": 1,
      "name_kr": "무료 Wi-Fi",
      "name_en": "Free Wi-Fi",
      "description": "전 객실 무료 Wi-Fi 제공"
    }
  ]
}
```

---

## 🤝 기여하기

우리는 모든 기여를 환영합니다! 프로젝트 개선에 도움을 주시려면 다음 단계를 따르세요.

### 🔄 기여 프로세스

1. **저장소 Fork**
   ```bash
   # GitHub에서 Fork 버튼 클릭
   ```

2. **로컬 저장소 클론**
   ```bash
   git clone https://github.com/[your-username]/select3-admin.git
   cd select3-admin
   ```

3. **기능 브랜치 생성**
   ```bash
   git checkout -b feature/amazing-feature
   ```

4. **변경사항 커밋**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```

5. **브랜치에 푸시**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Pull Request 생성**
   - GitHub에서 Pull Request 생성
   - 변경사항에 대한 상세한 설명 작성
   - 관련 이슈 번호 연결

### 📋 기여 가이드라인

#### 🐛 버그 리포트
```markdown
**버그 설명**
간단하고 명확한 버그 설명

**재현 단계**
1. '...'로 이동
2. '...' 클릭
3. '...' 스크롤
4. 오류 확인

**예상 동작**
예상했던 동작 설명

**실제 동작**
실제로 발생한 동작 설명

**스크린샷**
가능하다면 스크린샷 첨부

**환경 정보**
- OS: [e.g. macOS 12.0]
- Browser: [e.g. Chrome 91.0]
- Node.js: [e.g. 18.18.0]
```

#### ✨ 기능 요청
```markdown
**기능 설명**
요청하는 기능에 대한 명확한 설명

**문제점**
현재 어떤 문제가 있는지 설명

**해결 방안**
제안하는 해결 방안 설명

**대안**
다른 해결 방안이 있다면 설명

**추가 정보**
기능과 관련된 추가 정보나 맥락
```

#### 🔧 개발 기여

**코드 스타일**
- Prettier 설정 준수
- ESLint 규칙 준수
- TypeScript strict 모드 사용

**테스트**
- 새로운 기능에 대한 테스트 작성
- 기존 테스트 수정시 모든 테스트 통과 확인

**문서화**
- 새로운 API 엔드포인트 문서화
- 복잡한 로직에 대한 주석 작성
- README 업데이트 (필요시)

### 🏷 라벨 시스템

- `bug`: 버그 수정
- `feature`: 새로운 기능
- `enhancement`: 기존 기능 개선
- `documentation`: 문서 업데이트
- `refactor`: 코드 리팩토링
- `test`: 테스트 관련
- `performance`: 성능 개선
- `security`: 보안 관련

### 📞 커뮤니티

- **Discussions**: 일반적인 질문이나 아이디어 공유
- **Issues**: 버그 리포트나 기능 요청
- **Pull Requests**: 코드 기여

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

```
MIT License

Copyright (c) 2024 Select3 Admin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 📞 지원

### 🆘 도움이 필요하신가요?

- **📧 이메일**: support@select3-admin.com
- **💬 Discussions**: [GitHub Discussions](https://github.com/[your-username]/select3-admin/discussions)
- **🐛 버그 리포트**: [GitHub Issues](https://github.com/[your-username]/select3-admin/issues)
- **📖 문서**: [Wiki](https://github.com/[your-username]/select3-admin/wiki)

### 🔗 관련 링크

- **Supabase**: [supabase.com](https://supabase.com)
- **Next.js**: [nextjs.org](https://nextjs.org)
- **Tailwind CSS**: [tailwindcss.com](https://tailwindcss.com)
- **shadcn/ui**: [ui.shadcn.com](https://ui.shadcn.com)

---

<div align="center">

**Select3 Admin으로 더 나은 호텔 관리 경험을 시작하세요! 🚀**

Made with ❤️ by Select3 Team

</div>