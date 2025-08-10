## 셀렉트 어드민 (Next.js 15, src/app, TypeScript, Tailwind v4)

호텔/혜택 관리를 위한 관리자 인터페이스입니다.
Next.js 15 App Router, 엄격한 TypeScript, Tailwind v4 위에서 동작합니다.

### 기술 스택
- Next.js 15 (App Router, `src/app/**`)
- TypeScript (strict), 경로 별칭 `@/*` → `src/*`
- Tailwind CSS v4 (`src/lib/utils`의 `cn(...)` 사용)
- Supabase (서버 전용 서비스 클라이언트)
- shadcn 호환 UI 프리미티브(`src/components/ui`)

### 주요 기능
- 호텔 검색 자동완성(한글/영문/Sabre ID) + 키보드 내비게이션
- 호텔 상세 테스트(시작/종료일 자동, RatePlan 테이블 추출, JSON 복사)
- 호텔 업데이트: Benefits 매핑(추가/삭제/멀티선택/드래그앤드롭 정렬 저장)
- Benefits 마스터 관리(`select_hotel_benefits` CRUD)

## 프로젝트 구조

```
src/
  app/
    admin/
      benefits/
        manage/              # Benefits 관리 화면
      hotel-search/          # 호텔 검색 화면
      hotel-update/          # 호텔 목록/상세 편집
        [sabre]/             # Sabre 기준 상세 편집
          page.tsx
    api/
      benefits/
        list/route.ts        # Benefits 리스트 API
      hotel/
        search/route.ts      # 호텔 검색 API (세이프 머지)
        suggest/route.ts     # 자동완성 API
        update-rate-plan-codes/route.ts
      rate-plan-codes/route.ts
    layout.tsx
    globals.css
  components/
    shared/                  # 앱 쉘, 페이징, date-input, 공용 액션
    ui/                      # Button, Input 등 shadcn 스타일
  features/
    hotels/
      components/            # SearchForm, BenefitsManager, 저장 컨트롤
      lib/                   # Supabase 저장소(서버 전용)
  lib/
    supabase/                # 서버/클라이언트 헬퍼 진입점
    utils.ts                 # cn(...), 헬퍼
  types/                     # 전역 타입 (예: hotel.ts)
```

WHY/HOW 아키텍처는 `.cursor/rules/architecture-guide.mdc`,
강제 규칙/체크리스트는 `.cursor/rules/project-guardrail.mdc`를 참고하세요.

## 로컬 개발

### 사전 준비
- Node.js 18+
- pnpm 8+ (권장)
- Supabase 환경 변수

### 설치
```bash
pnpm install
```

### 개발 서버 실행
```bash
pnpm dev
# http://localhost:3000
```

개발 캐시(.next) 문제(ENOENT 임시파일 등) 발생 시:
```bash
rd /s /q .next  # PowerShell: Remove-Item -Recurse -Force .next
pnpm dev
```

### 빌드
```bash
pnpm build
```

### 린트
```bash
pnpm lint
```

## 테스트

Vitest + Testing Library 구성되어 있습니다.

```bash
pnpm test       # 단발 실행
pnpm test:watch # 감시 모드
pnpm test:ui    # Vitest UI
```

테스트는 `src/tests/{unit,integration,e2e}`에 위치합니다.
자세한 원칙은 `.cursor/rules/testing-guidelines.mdc` 참고.

## API 규약

모든 API 라우트는 `src/app/api/**/route.ts` 하위에 위치합니다.
응답은 `.cursor/rules/api-contracts.mdc`를 따릅니다.
- 성공: `{ success: true, data, meta? }`
- 실패: `{ success: false, error, code?, details? }`
- 적절한 상태코드, 캐싱/재검증 지침 준수

## 보안 & 시크릿

Supabase 서비스 롤 클라이언트는 반드시 `src/lib/supabase/server.ts`에서만 생성합니다.
클라이언트 컴포넌트로 시크릿이 노출되지 않도록 합니다.
자세한 내용은 `.cursor/rules/security-and-secrets.mdc`.

## UI/UX & shadcn

공용 프리미티브(`src/components/ui`, `src/components/shared`) 사용을 권장합니다.
접근성(ARIA/키보드)과 일관된 상태를 보장하세요.
`.cursor/rules/ui-ux-shadcn.mdc` 참고.

## 의존성 정책

의존성은 최소/보안/일관성을 유지합니다.
`.cursor/rules/dependency-policy.mdc` 참고.

## 커밋 & PR

Conventional Commits 규칙을 따르고 PR 체크리스트를 사용합니다.
`.cursor/rules/commit-and-pr.mdc` 참고.

## 릴리즈 & 브랜칭

`main`에서 SemVer 태그(`vX.Y.Z`)를 사용합니다. 핫픽스는 `hotfix/*`로 분기 후 `main`에 병합합니다.
`.cursor/rules/release-and-branching.mdc` 참고.

## 비고

- 날짜는 `string | number | Date`만을 사용해 생성하며 사전 가드를 둡니다.
- 입력의 `defaultValue`는 항상 문자열(`String(value ?? '')`)을 전달합니다.
- 콤마 포함 검색 입력에서는 Supabase `or(...)`를 피하고, 개별 쿼리 후 병합합니다.

