# Select3 Admin - 호텔 관리 시스템

Select3 Admin은 호텔 체인과 브랜드를 관리하는 웹 기반 관리 시스템입니다.

## 🚀 주요 기능

- **호텔 관리**: 호텔 정보 조회, 수정, 혜택 매핑
- **체인 & 브랜드 관리**: 호텔 체인과 브랜드 CRUD 작업
- **혜택 관리**: 호텔별 혜택 설정 및 정렬
- **사용자 관리**: 관리자 계정 및 권한 관리
- **광고 관리**: 프로모션 및 광고 콘텐츠 관리
- **Sabre API 연동**: 호텔 정보 및 요금 조회

## 🛠 기술 스택

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **External APIs**: Sabre API
- **Package Manager**: pnpm

## 📋 요구사항

- Node.js 18+ 
- pnpm
- Supabase 계정 및 프로젝트
- Sabre API 계정 (선택사항)

## 🚀 설치 및 실행

### 1. 저장소 클론

```bash
git clone https://github.com/[your-username]/select3-admin.git
cd select3-admin
```

### 2. 의존성 설치

```bash
pnpm install
```

### 3. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Sabre API (선택사항)
SABRE_CLIENT_ID=your_sabre_client_id
SABRE_CLIENT_SECRET=your_sabre_client_secret

# Next.js
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 4. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 5. 프로덕션 빌드

```bash
pnpm build
pnpm start
```

## 🗄 데이터베이스 설정

Supabase에서 다음 테이블들을 생성해야 합니다:

- `select_hotels` - 호텔 정보
- `select_hotel_benefits` - 혜택 마스터
- `select_hotel_benefits_map` - 호텔-혜택 매핑
- `select_chain_brands` - 체인 & 브랜드
- `users` - 사용자 계정

자세한 스키마는 `SUPABASE_TABLES.sql` 파일을 참조하세요.

## 🧪 테스트

```bash
pnpm test
```

## 📁 프로젝트 구조

```
src/
├── app/                 # Next.js App Router
│   ├── admin/          # 관리자 페이지
│   ├── api/            # API 라우트
│   └── auth/           # 인증 페이지
├── components/          # UI 컴포넌트
│   ├── shared/         # 공통 컴포넌트
│   └── ui/             # shadcn/ui 컴포넌트
├── features/            # 도메인별 기능
├── lib/                 # 유틸리티 및 설정
└── types/               # TypeScript 타입 정의
```

## 🔧 개발 가이드

### 코드 스타일

- TypeScript strict 모드 사용
- Conventional Commits 규칙 준수
- Tailwind CSS 클래스는 `cn()` 유틸리티로 조합
- 서버 컴포넌트 우선, 클라이언트 컴포넌트는 필요시에만

### API 설계

- RESTful API 설계 원칙 준수
- 일관된 응답 형식: `{ success: boolean, data?: any, error?: string }`
- 적절한 HTTP 상태 코드 사용
- 입력 검증 및 에러 처리

## 🚀 배포

### Vercel 배포 (권장)

1. [Vercel](https://vercel.com)에 GitHub 계정 연결
2. `select3-admin` 레포지토리 import
3. 환경 변수 설정
4. 자동 배포 활성화

### 수동 배포

```bash
pnpm build
pnpm start
```

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 지원

프로젝트에 대한 질문이나 이슈가 있으시면 GitHub Issues를 통해 문의해 주세요.

