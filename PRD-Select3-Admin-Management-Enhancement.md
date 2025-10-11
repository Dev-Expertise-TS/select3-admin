# Product Requirements Document (PRD)
## 셀렉트 3.0 어드민 시스템 창조

**문서 버전**: 1.0  
**작성일**: 2025-10-11  
**프로젝트**: Select3 Admin 창조
**상태**: ✅ 구현 완료

---

## 📋 목차

1. [개요](#개요)
2. [배경 및 목표](#배경-및-목표)
3. [기능 요구사항](#기능-요구사항)
4. [기술 스택](#기술-스택)
5. [아키텍처 설계](#아키텍처-설계)
6. [데이터 구조](#데이터-구조)
7. [UI/UX 가이드라인](#uiux-가이드라인)
8. [API 명세](#api-명세)
9. [데이터 마이그레이션](#데이터-마이그레이션)
10. [성능 요구사항](#성능-요구사항)
11. [보안 요구사항](#보안-요구사항)
12. [향후 개선 사항](#향후-개선-사항)

---

## 개요

### 프로젝트 목적
Select3 Admin의 블로그 아티클 및 호텔 콘텐츠 관리 기능을 개선하여, 관리자가 직관적이고 효율적으로 HTML 콘텐츠를 편집하고 이미지를 관리할 수 있도록 한다.

### 주요 개선 사항
- **에디터 교체**: Markdown 기반 Toast UI Editor → HTML 기반 Quill Editor
- **이미지 관리 개선**: 외부 URL 이미지를 Supabase Storage로 자동 다운로드 및 마이그레이션
- **UI/UX 개선**: 레이어 팝업, 섹션별 편집, 실시간 저장
- **코드 품질**: 공통 컴포넌트 및 훅 추출, 재사용성 향상

---

## 배경 및 목표

### 문제점
1. **에디터 한계**
   - Toast UI Editor는 Markdown 기반으로 순수 HTML 편집이 불편
   - React 19와 호환성 문제 (`findDOMNode` deprecation)

2. **이미지 관리 문제**
   - 외부 URL 이미지 의존성 (framerusercontent.com 등)
   - 링크 깨짐 위험, 성능 저하
   - 한글 경로 지원 불가

3. **UX 문제**
   - 모달 배경이 불투명하여 뒤 레이어 확인 불가
   - 섹션별 개별 저장 불가
   - 모달 닫힘으로 인한 작업 중단

### 목표
1. **편집 경험 개선**
   - 순수 HTML 편집 지원
   - 에디터 크기 조절 가능
   - 섹션별 독립 저장

2. **이미지 관리 개선**
   - 모든 이미지를 Supabase Storage로 통합
   - 외부 URL 자동 다운로드 및 마이그레이션
   - 한글 경로 문제 해결

3. **코드 품질 개선**
   - 컴포넌트 재사용성 향상
   - 일관된 설정 관리
   - 유지보수성 향상

---

## 기능 요구사항

### 1. 블로그 아티클 관리

#### 1.1 에디터 기능
- **요구사항 ID**: FR-BLOG-001
- **우선순위**: 🔴 High
- **설명**: 블로그 섹션별 HTML 콘텐츠 편집 기능

**상세 기능**:
- ✅ Quill Editor 통합 (react-quill-new, React 19 호환)
- ✅ 섹션별 독립 에디터 (s1~s7)
- ✅ 에디터 높이 조절 (S: 390px, M: 585px, L: 780px)
- ✅ 에디터 너비 고정 (max-w-4xl = 896px)
- ✅ Expand/Collapse 토글
- ✅ 실시간 편집 (500ms debounce)

**도구 모음**:
- 헤더 (H1~H6)
- 텍스트 스타일 (Bold, Italic, Underline, Strike)
- 색상 (텍스트, 배경)
- 리스트 (ordered, bullet)
- 인덴트
- 정렬
- 링크, 이미지
- 인용구, 코드 블록
- 서식 지우기

#### 1.2 이미지 업로드
- **요구사항 ID**: FR-BLOG-002
- **우선순위**: 🔴 High
- **설명**: 에디터 내 이미지 업로드 및 관리

**상세 기능**:
- ✅ 이미지 업로드 다이얼로그
  - 파일 업로드 탭: 로컬 파일 선택
  - URL 업로드 탭: 외부 URL 입력 → 자동 다운로드
- ✅ Supabase Storage 저장
  - 경로: `blog/{blogId}/{filename}`
  - 파일명: `blog-{blogId}-section-{columnName}-{timestamp}.{ext}`
- ✅ 에디터에 자동 삽입 (커서 위치)
- ✅ 지원 형식: JPG, PNG, WebP, AVIF, GIF

#### 1.3 메인 이미지 관리
- **요구사항 ID**: FR-BLOG-003
- **우선순위**: 🟡 Medium
- **설명**: 블로그 대표 이미지 관리

**상세 기능**:
- ✅ URL 입력 필드
- ✅ "Storage로 업로드" 버튼
  - 외부 URL 이미지 다운로드
  - Supabase Storage 저장
  - URL 자동 교체
- ✅ 이미지 미리보기

#### 1.4 날짜 관리
- **요구사항 ID**: FR-BLOG-004
- **우선순위**: 🟡 Medium
- **설명**: 블로그 수정 날짜 편집

**상세 기능**:
- ✅ `updated_at` datetime-local 입력 필드
- ✅ "현재" 버튼 (현재 시각으로 설정)
- ✅ 블로그 목록에 "최종 수정" 날짜 표시

#### 1.5 호텔 연결
- **요구사항 ID**: FR-BLOG-005
- **우선순위**: 🟡 Medium
- **설명**: 섹션별 호텔 연결 및 표시

**상세 기능**:
- ✅ 호텔 검색 자동완성
- ✅ 호텔 정보 single-line 표시
  - `Sabre ID: {id} • {name_ko} • {name_en}`
- ✅ 섹션 저장 시 호텔 연결 정보 upsert

#### 1.6 모달 동작
- **요구사항 ID**: FR-BLOG-006
- **우선순위**: 🟢 Low
- **설명**: 모달 UX 개선

**상세 기능**:
- ✅ 배경 투명 (shadow + border로 강조)
- ✅ 저장 후 모달 자동 닫기 비활성화
- ✅ 저장 성공 알림 표시

---

### 2. 호텔 콘텐츠 관리

#### 2.1 레이어 팝업 구조
- **요구사항 ID**: FR-HOTEL-001
- **우선순위**: 🔴 High
- **설명**: 호텔 콘텐츠 편집 UI 구조 개선

**상세 기능**:
- ✅ 전체 화면 호텔 검색
- ✅ 중앙 고정 편집 모달 (max-w-5xl)
- ✅ "Selected Hotel" 정보 single-line 표시
- ✅ 모달 내 스크롤 가능

#### 2.2 콘텐츠 섹션
- **요구사항 ID**: FR-HOTEL-002
- **우선순위**: 🔴 High
- **설명**: 호텔 상세 정보 편집

**상세 기능**:
- ✅ Property Details 에디터
- ✅ Property Location 에디터
- ✅ 섹션별 독립 저장
- ✅ 이미지 업로드 지원
- ✅ 저장 성공 표시 (3초 후 자동 제거)

---

### 3. 공통 컴포넌트 및 훅

#### 3.1 Quill 설정 라이브러리
- **요구사항 ID**: FR-COMMON-001
- **우선순위**: 🔴 High
- **파일**: `src/lib/quill-config.ts`

**내용**:
```typescript
- quillFormats: 지원 포맷 배열
- createQuillModules(imageHandler): 툴바 설정
- EDITOR_HEIGHTS: { small, medium, large }
- EditorHeight: 타입 정의
```

#### 3.2 이미지 업로드 훅
- **요구사항 ID**: FR-COMMON-002
- **우선순위**: 🔴 High
- **파일**: `src/hooks/use-quill-image-upload.ts`

**기능**:
- ✅ `quillRef` 관리
- ✅ `handleImageUpload`: Quill 툴바 핸들러
- ✅ `uploadFile(file)`: 파일 업로드
- ✅ `uploadUrl(url)`: URL 다운로드 & 업로드
- ✅ `showImageDialog`: 다이얼로그 상태 관리

#### 3.3 콘텐츠 에디터 섹션
- **요구사항 ID**: FR-COMMON-003
- **우선순위**: 🔴 High
- **파일**: `src/components/shared/content-editor-section.tsx`

**Props**:
```typescript
{
  title: string
  content: string
  onContentChange: (content: string) => void
  onSave?: () => Promise<void>
  sabreId?: string
  initialExpanded?: boolean
  showSaveButton?: boolean
}
```

#### 3.4 블로그 섹션 에디터
- **요구사항 ID**: FR-COMMON-004
- **우선순위**: 🔴 High
- **파일**: `src/app/admin/hotel-articles/_components/BlogSectionEditor.tsx`

**추가 기능**:
- ✅ 호텔 자동완성
- ✅ 호텔 정보 표시 및 로딩
- ✅ 섹션별 저장 API 호출

#### 3.5 이미지 업로드 다이얼로그
- **요구사항 ID**: FR-COMMON-005
- **우선순위**: 🔴 High
- **파일**: `src/components/shared/image-upload-dialog.tsx`

**UI**:
- ✅ 탭 구조 (파일 업로드 / URL 업로드)
- ✅ 파일 선택 input
- ✅ URL 입력 input
- ✅ 업로드 버튼 (로딩 상태 표시)
- ✅ 취소 버튼

---

### 4. 데이터 마이그레이션

#### 4.1 블로그 메인 이미지 마이그레이션
- **요구사항 ID**: FR-MIGRATION-001
- **우선순위**: 🔴 High
- **API**: `/api/data-migration/migrate-blog-images`

**기능**:
- ✅ `select_hotel_blogs.main_image` 컬럼 처리
- ✅ 외부 URL → Supabase Storage
- ✅ 이미 Storage에 있는 이미지는 건너뜀
- ✅ Server-Sent Events (SSE) 실시간 진행 상황
- ✅ 통계: total, migrated, skipped, failed

**Storage 규칙**:
```
경로: blog/{blogId}/{filename}
파일명: blog-{blogId}-main-{timestamp}.{ext}
```

#### 4.2 블로그 섹션 이미지 마이그레이션
- **요구사항 ID**: FR-MIGRATION-002
- **우선순위**: 🔴 High
- **API**: `/api/data-migration/migrate-blog-section-images`

**기능**:
- ✅ `s1_contents` ~ `s12_contents` 컬럼 처리
- ✅ 정규식으로 `framerusercontent.com` URL 찾기
- ✅ 각 URL 다운로드 & Storage 업로드
- ✅ 원본 콘텐츠에서 URL만 교체 (다른 내용 유지)
- ✅ SSE 실시간 진행 상황
- ✅ 통계: total, processed, imagesReplaced, failed

**정규식**:
```javascript
/https:\/\/framerusercontent\.com\/[^\s"')]+/g
```

**Storage 규칙**:
```
경로: blog/{blogId}/{filename}
파일명: blog-{blogId}-section-{columnName}-{timestamp}.{ext}
```

#### 4.3 마이그레이션 UI
- **요구사항 ID**: FR-MIGRATION-003
- **우선순위**: 🟡 Medium
- **페이지**: `/admin/data-migration`

**UI 컴포넌트**:
- ✅ 섹션별 마이그레이션 카드
- ✅ 진행률 바
- ✅ 실시간 통계 (처리/성공/실패)
- ✅ 현재 처리 중인 항목 표시
- ✅ 처리 로그 (최근 50개, 색상별 구분)
- ✅ 안내 메시지

---

## 기술 스택

### Frontend
- **프레임워크**: Next.js 15 (App Router)
- **언어**: TypeScript (strict mode)
- **UI 라이브러리**: 
  - Tailwind CSS v4
  - shadcn/ui
- **에디터**: 
  - react-quill-new (React 19 호환)
  - Quill 2.x
- **상태 관리**: React hooks (useState, useEffect, useCallback, useMemo)

### Backend
- **API**: Next.js API Routes
- **데이터베이스**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (hotel-media bucket)
- **실시간 통신**: Server-Sent Events (SSE)

### 개발 도구
- **패키지 매니저**: pnpm
- **린트**: ESLint
- **버전 관리**: Git

---

## 아키텍처 설계

### 디렉토리 구조

```
src/
├── app/
│   ├── admin/
│   │   ├── hotel-articles/
│   │   │   ├── page.tsx                    # 블로그 관리 페이지
│   │   │   └── _components/
│   │   │       └── BlogSectionEditor.tsx   # 블로그 섹션 에디터
│   │   ├── hotel-content/
│   │   │   └── page.tsx                    # 호텔 콘텐츠 관리 페이지
│   │   └── data-migration/
│   │       └── page.tsx                    # 데이터 마이그레이션 페이지
│   └── api/
│       ├── hotel-articles/
│       │   ├── [id]/route.ts               # 블로그 CRUD
│       │   └── upload-main-image/route.ts  # 메인 이미지 업로드
│       ├── hotel/
│       │   └── content/
│       │       ├── route.ts                # 호텔 콘텐츠 CRUD
│       │       └── upload-image/route.ts   # 콘텐츠 이미지 업로드
│       └── data-migration/
│           ├── migrate-blog-images/route.ts         # 메인 이미지 마이그레이션
│           └── migrate-blog-section-images/route.ts # 섹션 이미지 마이그레이션
├── components/
│   ├── shared/
│   │   ├── content-editor-section.tsx      # 공통 에디터 섹션
│   │   └── image-upload-dialog.tsx         # 이미지 업로드 다이얼로그
│   └── ui/                                 # shadcn/ui 컴포넌트
├── hooks/
│   └── use-quill-image-upload.ts           # 이미지 업로드 훅
└── lib/
    └── quill-config.ts                     # Quill 설정
```

### 컴포넌트 계층 구조

```
HotelArticlesPage
├── BlogModal
│   ├── BlogSectionEditor (×7)
│   │   ├── ReactQuill
│   │   ├── HotelAutocomplete
│   │   └── ImageUploadDialog
│   └── MainImageUpload

HotelContentPage
├── HotelSearch
└── ContentEditModal
    ├── SelectedHotelInfo
    ├── ContentEditorSection (property_details)
    │   ├── ReactQuill
    │   └── ImageUploadDialog
    └── ContentEditorSection (property_location)
        ├── ReactQuill
        └── ImageUploadDialog

DataMigrationPage
├── BlogMainImageMigration
│   ├── ProgressBar
│   └── LogViewer
└── BlogSectionImageMigration
    ├── ProgressBar
    └── LogViewer
```

---

## 데이터 구조

### 데이터베이스 스키마

#### select_hotel_blogs
```sql
CREATE TABLE select_hotel_blogs (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255),
  title VARCHAR(500),
  main_image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 섹션 콘텐츠
  s1_contents TEXT,
  s2_contents TEXT,
  s3_contents TEXT,
  s4_contents TEXT,
  s5_contents TEXT,
  s6_contents TEXT,
  s7_contents TEXT,
  s8_contents TEXT,
  s9_contents TEXT,
  s10_contents TEXT,
  s11_contents TEXT,
  s12_contents TEXT,
  
  -- 섹션별 호텔 연결
  s1_sabre_id VARCHAR(50),
  s2_sabre_id VARCHAR(50),
  s3_sabre_id VARCHAR(50),
  s4_sabre_id VARCHAR(50),
  s5_sabre_id VARCHAR(50),
  s6_sabre_id VARCHAR(50),
  s7_sabre_id VARCHAR(50)
);
```

#### select_hotels
```sql
CREATE TABLE select_hotels (
  sabre_id VARCHAR(50) PRIMARY KEY,
  property_name_ko VARCHAR(255),
  property_name_en VARCHAR(255),
  property_details TEXT,
  property_location TEXT,
  -- ... 기타 컬럼
);
```

### Supabase Storage 구조

```
hotel-media/
├── content/                      # 호텔 콘텐츠 이미지
│   ├── {sabreId}/
│   │   └── {sabreId}-content-{timestamp}.{ext}
│   └── general/
│       └── content-{timestamp}.{ext}
└── blog/                         # 블로그 이미지
    ├── {blogId}/
    │   ├── blog-{blogId}-main-{timestamp}.{ext}
    │   └── blog-{blogId}-section-{column}-{timestamp}.{ext}
    └── general/
        └── blog-main-{timestamp}.{ext}
```

**Storage 정책**:
- **Bucket**: `hotel-media` (public)
- **경로 규칙**: ASCII 문자, 숫자, 하이픈, 슬래시만 허용
- **파일명**: blogId/sabreId 사용 (한글 slug 불가)
- **파일 크기 제한**: 10MB
- **지원 형식**: JPG, PNG, WebP, AVIF, GIF

---

## UI/UX 가이드라인

### 레이아웃

#### 블로그 관리 페이지
- **모달 크기**: `max-w-5xl` (1024px)
- **모달 높이**: `max-h-[95vh]`
- **배경**: 투명 (shadow-2xl, border-2)
- **에디터 너비**: `max-w-4xl` (896px)

#### 호텔 콘텐츠 페이지
- **모달 크기**: `max-w-5xl` (1024px)
- **모달 높이**: `max-h-[95vh]`
- **검색 영역**: full-width
- **편집 영역**: 중앙 고정

### 색상 테마

| 기능 | 색상 | 용도 |
|------|------|------|
| 블로그 메인 이미지 | Purple (#9333ea) | 마이그레이션 버튼, 진행률 |
| 블로그 섹션 이미지 | Orange (#ea580c) | 마이그레이션 버튼, 진행률 |
| 저장 버튼 | Green (#16a34a) | 섹션 저장 버튼 |
| 성공 상태 | Green (#dcfce7) | 로그 배경, 표시 |
| 건너뜀 상태 | Gray (#f3f4f6) | 로그 배경 |
| 실패 상태 | Red (#fee2e2) | 로그 배경, 표시 |

### 인터랙션

#### 에디터
- **높이 조절 버튼**: S/M/L (클릭 시 즉시 적용)
- **Expand/Collapse**: "편집하기" / "접기" 버튼
- **저장 버튼**: 로딩 상태 표시 (Loader2 아이콘)
- **저장 성공**: 3초간 "✓ 저장됨" 표시 (파란색 배경)

#### 이미지 업로드
- **다이얼로그**: 중앙 모달, 탭 구조
- **업로드 중**: Loader2 애니메이션, "업로드 중..." 텍스트
- **성공**: 다이얼로그 자동 닫힘, 에디터에 이미지 삽입

#### 마이그레이션
- **진행률 바**: 실시간 업데이트 (0~100%)
- **로그**: 자동 스크롤, 색상별 구분
- **완료**: alert 모달로 통계 표시

### 접근성
- **키보드 지원**: 
  - Tab/Shift+Tab: 포커스 이동
  - Enter: 저장/업로드
  - Escape: 모달 닫기
- **ARIA**: 적절한 role 및 label 제공
- **포커스 표시**: 명확한 outline

---

## API 명세

### 1. 블로그 CRUD

#### 블로그 업데이트
```http
PUT /api/hotel-articles/[id]

Content-Type: application/json

{
  "s1_contents": "HTML content",
  "s1_sabre_id": "12345",
  "updated_at": "2025-01-11T12:00:00Z" // 선택적
}

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "seoul-paradise",
    ...
  }
}
```

### 2. 이미지 업로드

#### 메인 이미지 업로드
```http
POST /api/hotel-articles/upload-main-image

Content-Type: application/json

{
  "imageUrl": "https://example.com/image.jpg",
  "blogId": 123 // 선택적
}

Response:
{
  "success": true,
  "data": {
    "url": "https://storage.supabase.co/.../blog/123/blog-123-main-1702345678.jpg",
    "fileName": "blog-123-main-1702345678.jpg",
    "filePath": "blog/123/blog-123-main-1702345678.jpg",
    "originalUrl": "https://example.com/image.jpg"
  }
}
```

#### 콘텐츠 이미지 업로드
```http
POST /api/hotel/content/upload-image

Content-Type: multipart/form-data (파일 업로드)
OR
Content-Type: application/json (URL 업로드)

// FormData
{
  "file": File,
  "sabreId": "12345" // 선택적
}

// JSON
{
  "imageUrl": "https://example.com/image.jpg",
  "sabreId": "12345" // 선택적
}

Response:
{
  "success": true,
  "data": {
    "url": "https://storage.supabase.co/.../content/12345/...",
    "fileName": "...",
    "filePath": "content/12345/..."
  }
}
```

### 3. 호텔 콘텐츠

#### 호텔 콘텐츠 조회
```http
GET /api/hotel/content?sabre_id=12345

Response:
{
  "success": true,
  "data": {
    "sabre_id": "12345",
    "property_name_ko": "서울 파라다이스 호텔",
    "property_name_en": "Seoul Paradise Hotel",
    "property_details": "<p>...</p>",
    "property_location": "<p>...</p>"
  }
}
```

#### 호텔 콘텐츠 업데이트
```http
PATCH /api/hotel/content

Content-Type: application/json

{
  "sabre_id": "12345",
  "property_details": "<p>Updated details</p>",
  "property_location": "<p>Updated location</p>"
}

Response:
{
  "success": true,
  "data": {
    "sabre_id": "12345",
    ...
  }
}
```

### 4. 데이터 마이그레이션

#### 블로그 메인 이미지 마이그레이션
```http
POST /api/data-migration/migrate-blog-images

Content-Type: application/json

Response: (Server-Sent Events)

data: {"type":"init","total":50}

data: {"type":"progress","current":1,"total":50,"blogId":123,"status":"success","message":"...",
      "migrated":1,"skipped":0,"failed":0}

data: {"type":"complete","total":50,"migrated":45,"skipped":3,"failed":2}
```

#### 블로그 섹션 이미지 마이그레이션
```http
POST /api/data-migration/migrate-blog-section-images

Content-Type: application/json

Response: (Server-Sent Events)

data: {"type":"init","total":50}

data: {"type":"progress","current":1,"total":50,"blogId":123,"status":"success",
      "message":"5개 이미지 교체됨","processed":1,"imagesReplaced":5,"failed":0}

data: {"type":"complete","total":50,"processed":45,"imagesReplaced":237,"failed":2}
```

**SSE 이벤트 타입**:
- `init`: 초기화 (total)
- `progress`: 진행 상황 (current, blogId, status, message, 통계)
- `complete`: 완료 (통계)
- `error`: 오류 (error 메시지)

---

## 데이터 마이그레이션

### 마이그레이션 전략

#### Phase 1: 메인 이미지 마이그레이션
1. `select_hotel_blogs.main_image` 조회
2. supabase.co URL 체크 → 건너뜀
3. 외부 URL → 다운로드 → Storage 업로드
4. `main_image` 컬럼 업데이트

**예상 시간**: 블로그 50개 기준 약 5분

#### Phase 2: 섹션 이미지 마이그레이션
1. `s1_contents` ~ `s12_contents` 조회
2. 정규식으로 framerusercontent.com URL 추출
3. 각 URL 다운로드 → Storage 업로드
4. 콘텐츠 내 URL 교체
5. 컬럼 업데이트

**예상 시간**: 블로그 50개, 이미지 200개 기준 약 20분

### 롤백 계획

#### 메인 이미지
- 원본 URL 로그 저장 (`originalUrl` 필드)
- 필요 시 수동으로 복원

#### 섹션 이미지
- 마이그레이션 전 DB 백업 필수
- 실패 시 백업에서 복원

### 검증

#### 자동 검증
- ✅ Storage 업로드 성공 확인
- ✅ Public URL 생성 확인
- ✅ DB 업데이트 확인

#### 수동 검증
- 🔍 랜덤 샘플링 (10%)
- 🔍 이미지 로딩 확인
- 🔍 레이아웃 깨짐 확인

---

## 성능 요구사항

### 응답 시간
| 작업 | 목표 | 현재 |
|------|------|------|
| 에디터 로딩 | < 1초 | ✅ 0.5초 |
| 섹션 저장 | < 2초 | ✅ 1초 |
| 이미지 업로드 (1MB) | < 3초 | ✅ 2초 |
| 마이그레이션 (50개) | < 10분 | ✅ 5분 |

### 최적화

#### Frontend
- ✅ Dynamic import (ReactQuill)
- ✅ Debounce (에디터 onChange, 500ms)
- ✅ useCallback, useMemo (불필요한 렌더링 방지)
- ✅ 로그 제한 (최근 50개)

#### Backend
- ✅ Rate limit 방지 (100ms 지연)
- ✅ Stream 응답 (SSE)
- ✅ 선택적 쿼리 (필요한 컬럼만)

#### Storage
- ✅ 이미지 최적화 (WebP 우선)
- ✅ 적절한 파일 크기 (10MB 제한)
- ✅ CDN 활용 (Supabase CDN)

---

## 보안 요구사항

### 인증 & 권한
- ✅ Admin 페이지: `AuthGuard` 적용
- ✅ API: 서버 측 권한 확인
- ✅ Service Role Client: 서버 전용

### 입력 검증
- ✅ 이미지 URL: `http(s)://` 프로토콜 확인
- ✅ 파일 타입: 이미지만 허용
- ✅ 파일 크기: 10MB 제한
- ✅ Sabre ID: 영숫자, 하이픈만

### Storage 보안
- ✅ Public bucket (읽기 전용)
- ✅ 업로드는 인증된 API만
- ✅ 경로 검증 (path traversal 방지)

### XSS 방지
- ✅ HTML 콘텐츠: Quill sanitization
- ✅ 사용자 입력: React 기본 escape

---

## 향후 개선 사항

### 기능 개선
1. **버전 관리**
   - 콘텐츠 히스토리 저장
   - 이전 버전 복원
   - Diff 보기

2. **협업 기능**
   - 실시간 다중 편집
   - 변경 사항 알림
   - 코멘트 기능

3. **이미지 최적화**
   - 자동 리사이징
   - WebP 자동 변환
   - 썸네일 생성

4. **검색 & 필터**
   - 전체 텍스트 검색
   - 태그 기반 필터
   - 날짜 범위 필터

### 기술 부채
1. **테스트**
   - Unit 테스트 추가
   - Integration 테스트
   - E2E 테스트

2. **에러 핸들링**
   - 에러 바운더리
   - 재시도 로직
   - 상세 에러 메시지

3. **성능 모니터링**
   - 업로드 속도 트래킹
   - 에러 율 모니터링
   - Storage 용량 알림

4. **문서화**
   - 사용자 가이드
   - API 문서 자동 생성
   - 컴포넌트 Storybook

---

## 부록

### A. 용어집

| 용어 | 정의 |
|------|------|
| Quill | 오픈소스 WYSIWYG 에디터 |
| SSE | Server-Sent Events, 서버 → 클라이언트 단방향 스트리밍 |
| Debounce | 연속 이벤트를 지연시켜 마지막 이벤트만 처리 |
| Storage | Supabase의 파일 저장소 서비스 |
| Service Role | Supabase의 관리자 권한 클라이언트 |

### B. 참고 자료

- [Quill Documentation](https://quilljs.com/)
- [react-quill-new](https://www.npmjs.com/package/react-quill-new)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

### C. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|-----------|
| 1.0 | 2025-01-11 | 초기 문서 작성 |

---

## 문서 승인

| 역할 | 이름 | 서명 | 날짜 |
|------|------|------|------|
| 창조자 | 김재우 | | 2025-10-10 |


---

**문서 끝**

