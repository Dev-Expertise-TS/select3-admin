# API Routes → Server Actions 리팩토링 분석

## 현재 상태
- 총 111개의 API route 파일
- 29개의 admin 페이지에서 86곳에서 fetch 사용

## 리팩토링 우선순위

### ✅ 완료
- **해시태그 관리** (8개 파일 → 1개 actions.ts)

### 🟢 높은 우선순위 (Server Actions 권장)
관리자 전용, 외부 노출 불필요, CRUD 위주

#### 1. 토픽 페이지 관리
- `api/topic-pages/route.ts` (GET, POST, PATCH)
- `api/topic-pages/list/route.ts`
- `api/topic-page-hotels/route.ts`
- **사용처**: `admin/topic-pages/**`
- **이유**: 내부 CRUD만, 타입 안정성 필요
- **절감**: ~6개 파일 → 1개 actions.ts

#### 2. 사용자 관리
- `api/users/list/route.ts`
- `api/users/update/route.ts`
- `api/users/delete/route.ts`
- `api/users/[id]/activity/route.ts`
- `api/users/confirm-email/route.ts`
- **사용처**: `admin/users/page.tsx`
- **이유**: 관리자 전용, 폼 중심
- **절감**: ~5개 파일 → 1개 actions.ts

#### 3. 프로모션 관리
- `api/promotions/list/route.ts`
- `api/promotions/mapped-hotels/route.ts`
- `api/promotion-slots/route.ts`
- `api/promotion-slots/[id]/route.ts`
- **사용처**: `admin/promotions/**`, `admin/advertisements/**`
- **이유**: 내부 관리 전용
- **절감**: ~4개 파일 → 1개 actions.ts

#### 4. 프로모션 배너 관리
- `api/promo-banners/create/route.ts`
- `api/promo-banners/update/route.ts`
- `api/promo-banners/delete/route.ts`
- `api/promo-banners/list/route.ts`
- **사용처**: `admin/advertisements/**`
- **절감**: ~4개 파일 → 1개 actions.ts

#### 5. 혜택 관리
- `api/benefits/manage/list/route.ts`
- `api/benefits/list/route.ts`
- **사용처**: `admin/benefits/manage/**`
- **이유**: CRUD 위주
- **절감**: ~2개 파일 → 1개 actions.ts

#### 6. 광고 노출 관리
- `api/feature-slots/route.ts`
- `api/feature-slots/banner/route.ts`
- **사용처**: `admin/advertisements/**`
- **절감**: ~2개 파일 → 1개 actions.ts

#### 7. 고객 만족도 관리
- `api/satisfaction-survey/list/route.ts`
- **사용처**: `admin/satisfaction-survey/**`
- **절감**: 1개 파일 → actions.ts에 통합

#### 8. 지역 관리
- `api/regions/route.ts`
- **사용처**: `admin/region-mapping/**`
- **절감**: 1개 파일 → actions.ts에 통합

### 🟡 중간 우선순위 (선택적)
일부 외부 사용 가능성 또는 복잡한 로직

#### 9. 호텔 아티클
- `api/hotel-articles/route.ts` (POST, GET)
- `api/hotel-articles/[id]/route.ts` (GET, PUT, DELETE)
- `api/hotel-articles/brands/route.ts`
- `api/hotel-articles/upload-main-image/route.ts`
- `api/hotel-articles/hotel-info/route.ts`
- **사용처**: `admin/hotel-articles/**`
- **고려사항**: 복잡한 섹션 에디터, 이미지 업로드
- **판단**: Server Actions 가능하지만 현재 구조 유지도 OK

#### 10. 호텔 정보 업데이트
- `api/hotel/update/route.ts`
- `api/hotel/update-single/route.ts`
- `api/hotel/update-benefits/route.ts`
- `api/hotel/update-chain-brand/route.ts`
- `api/hotel/update-code/route.ts`
- `api/hotel/update-images/route.ts`
- `api/hotel/update-region-data/route.ts`
- `api/hotel/update-rate-plan-codes/route.ts`
- **사용처**: `admin/hotel-update/**`
- **절감**: ~8개 파일 → 1개 actions.ts

### 🔴 낮은 우선순위 (API Routes 유지 권장)
외부 노출, 복잡한 비즈니스 로직, 특수 용도

#### 11. Sabre API (외부 연동)
- `api/sabre/token/route.ts`
- `api/sabre/hotel-rates/route.ts`
- `api/sabre/hotel-details/route.ts`
- `api/sabre/db-search/route.ts`
- `api/sabre-id/search/route.ts`
- `api/sabre-id/openai-search/route.ts`
- **이유**: 외부 API 프록시, 복잡한 비즈니스 로직
- **권장**: API Routes 유지 ✅

#### 12. 호텔 이미지 관리 (파일 처리)
- `api/hotel-images/upload/route.ts`
- `api/hotel-images/delete/route.ts`
- `api/hotel-images/rename/route.ts`
- `api/hotel-images/migrate/route.ts`
- `api/hotel-images/sync-to-db/route.ts`
- `api/hotel-images/list/route.ts`
- `api/hotel-images/version/route.ts`
- `api/hotel-images/reorder/**`
- **이유**: 파일 업로드/스토리지 처리, 복잡한 마이그레이션
- **권장**: API Routes 유지 ✅

#### 13. 데이터 마이그레이션 (배치 처리)
- `api/data-migration/**` (10개 파일)
- **이유**: 대용량 배치, 진행률 추적, 긴 실행 시간
- **권장**: API Routes 유지 ✅

#### 14. 인증 (Auth)
- `api/auth/login/route.ts`
- `api/auth/signup/route.ts`
- `api/auth/logout/route.ts`
- `api/auth/test-login/route.ts`
- **이유**: 세션/쿠키 처리, 외부 호출 가능성
- **권장**: API Routes 유지 ✅

#### 15. 테스트/개발 엔드포인트
- `api/test/**` (7개 파일)
- **이유**: 개발/디버깅 전용
- **권장**: API Routes 유지 ✅

#### 16. 호텔 조회 (읽기 전용)
- `api/hotel/get/route.ts`
- `api/hotel/search/route.ts`
- `api/hotel/suggest/route.ts`
- `api/hotels/list/route.ts`
- **이유**: 캐싱 전략 중요, 퍼블릭 API 가능성
- **권장**: API Routes 유지 ✅

#### 17. 체인/브랜드 관리
- `api/chain-brand/list/route.ts`
- `api/chain-brand/schema/route.ts`
- `api/chain-brand/chain/delete/route.ts`
- `api/chain-brand/brand/delete/route.ts`
- `api/hotel/connect-chain-brand/route.ts`
- **현재**: features/chain-brand/actions.ts 이미 존재
- **권장**: 기존 actions.ts 활용, API 단계적 제거 고려

## 권장 리팩토링 순서

### 1단계 (즉시 가능) - 약 30개 파일 절감
- ✅ 해시태그 관리 (완료)
- 토픽 페이지 관리
- 사용자 관리
- 프로모션 관리
- 프로모션 배너 관리

### 2단계 (검토 후) - 약 20개 파일 절감
- 혜택 관리
- 광고 노출 관리
- 호텔 정보 업데이트

### 유지 (API Routes)
- Sabre API 연동
- 이미지 처리
- 데이터 마이그레이션
- 인증
- 테스트 엔드포인트
- 호텔 조회

## 예상 효과
- 파일 수: 111개 → ~60개 (약 46% 감소)
- 타입 안정성 향상
- 코드 가독성 개선
- 유지보수 비용 감소

