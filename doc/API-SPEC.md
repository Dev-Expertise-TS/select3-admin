# Select3 Admin API 명세서

이 문서는 Select3 Admin 프로젝트에서 사용하는 **모든 API**에 대한 상세 명세입니다.  
응답 형식은 프로젝트 규칙에 따라 `{ success, data?, error?, code?, meta? }` 형태를 따릅니다.

---

## 목차

1. [공통 규칙](#1-공통-규칙)
2. [인증 (Auth)](#2-인증-auth)
3. [호텔 (Hotel)](#3-호텔-hotel)
4. [혜택 (Benefits)](#4-혜택-benefits)
5. [지역 (Regions)](#5-지역-regions)
6. [호텔 이미지 (Hotel Images)](#6-호텔-이미지-hotel-images)
7. [호텔 아티클 (Hotel Articles)](#7-호텔-아티클-hotel-articles)
8. [Sabre / 요금](#8-sabre--요금)
9. [대시보드 / 프로모션 / 기타](#9-대시보드--프로모션--기타)
10. [데이터 마이그레이션](#10-데이터-마이그레이션)
11. [테스트 / 유틸](#11-테스트--유틸)

---

## 1. 공통 규칙

### 응답 형식

- **성공**: `{ success: true, data: T, meta?: { count?, page?, pageSize?, totalPages? } }`
- **실패**: `{ success: false, error: string, code?: string, details?: object }`

### HTTP 상태 코드

| 코드 | 의미 |
|------|------|
| 200 | 성공 (GET 등) |
| 201 | 리소스 생성 성공 |
| 204 | 성공, 본문 없음 (DELETE 등) |
| 400 | 잘못된 요청 / 검증 실패 |
| 401 | 인증 필요 / 토큰 무효 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 충돌 (중복 등) |
| 422 | 시맨틱 검증 실패 |
| 429 | 요청 제한 초과 |
| 500 | 서버 내부 오류 |

### 캐시

- 동적 데이터: `Cache-Control: no-store` 또는 `revalidate` 사용
- 정적성 데이터: `revalidate` TTL (예: 60~300초) 적용
- mutation 후: `revalidatePath` / `revalidateTag` 사용

---

## 2. 인증 (Auth)

### POST `/api/auth/login`

로그인. 이메일/비밀번호로 Supabase `signInWithPassword` 호출 후 사용자 정보 반환.

**Request Body**

```json
{
  "email": "string (trim)",
  "password": "string (trim)"
}
```

**Response**

- `200`: `{ success: true, data: { id, email, role, created_at, last_sign_in_at, email_confirmed_at, updated_at } }`
- `400`: 이메일/비밀번호 누락
- `401`: `{ success: false, error, code?: "INVALID_CREDENTIALS" | "INVALID_PASSWORD" | "EMAIL_NOT_CONFIRMED" | "TOO_MANY_REQUESTS" | "USER_NOT_FOUND" }`
- `404`: 사용자 정보 없음
- `500`: 서버/환경 변수 오류

---

### POST `/api/auth/logout`

로그아웃. Supabase `signOut` 호출.

**Response**

- `200`: `{ success: true, message: "로그아웃되었습니다." }`
- `500`: `{ success: false, error }`

---

### POST `/api/auth/signup`

회원가입. Supabase Admin `createUser` + 메타데이터 `role` 설정.

**Request Body**

```json
{
  "email": "string (trim)",
  "password": "string (trim, min 6)",
  "role": "string (optional, default: 'user')"
}
```

**Response**

- `201`: `{ success: true, data: { id, email, role, ... } }`
- `400`: 이메일/비밀번호 누락 또는 비밀번호 6자 미만
- `409`: 이미 등록된 이메일
- `500`: 생성/역할 설정 실패

---

### POST `/api/auth/change-password`

로그인 사용자의 비밀번호 변경. 세션 필요. 현재 비밀번호 검증 후 `updateUser({ password })`.

**Request Body**

```json
{
  "currentPassword": "string (trim)",
  "newPassword": "string (trim, min 6)"
}
```

**Response**

- `200`: `{ success: true, data: { id, email, role, ... } }`
- `400`: 필드 누락, 새 비밀번호 6자 미만, 현재=새 비밀번호, 현재 비밀번호 불일치
- `401`: 세션 없음
- `500`: 서버 오류

---

### POST `/api/auth/reset-password`

비밀번호 재설정 이메일 발송. `resetPasswordForEmail` 호출.  
보안상 실패 시에도 사용자에게는 성공 메시지를 반환할 수 있음.

**Request Body**

```json
{
  "email": "string (trim)"
}
```

**Response**

- `200`: `{ success: true, message: "비밀번호 재설정 링크가 전송되었습니다. ..." }`
- `400`: 이메일 누락 또는 형식 오류

---

### GET `/api/auth/reset-password/verify`

비밀번호 재설정 링크 검증. Query: `code`, `token_hash`, `type`.  
`token_hash` + `type=recovery`이면 `verifyOtp`, 없으면 `exchangeCodeForSession` 시도.  
성공 시 `/auth/reset-password?verified=true`로 리다이렉트.

**Response**

- 리다이렉트 302 또는 `200`: 성공
- `400`: 토큰/코드 유효하지 않음 또는 만료
- `500`: 서버 오류

---

### POST `/api/auth/reset-password/update`

재설정 링크로 들어온 세션으로 새 비밀번호 저장. 쿠키(세션) 필요.

**Request Body**

```json
{
  "password": "string (trim, min 6)"
}
```

**Response**

- `200`: `{ success: true, message: "비밀번호가 성공적으로 변경되었습니다." }`
- `400`: 비밀번호 누락/6자 미만
- `401`: 세션 없음
- `500`: 서버 오류

---

### POST `/api/auth/test-login`

테스트용 로그인. Anon 클라이언트로 `signInWithPassword` 호출.

**Request Body**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response**

- `200`: `{ success: true, data: { userId, email, role, hasSession } }`
- `400`: 이메일/비밀번호 누락
- 그 외: `{ success: false, error, details? }`

---

## 3. 호텔 (Hotel)

### GET `/api/hotel/get?sabre_id={sabre_id}`

Sabre ID로 호텔 단건 조회. `select_hotels` 테이블.

**Response**

- `200`: `{ success: true, data: hotelRow }`
- `400`: sabre_id 없음
- `404`: 해당 호텔 없음 (PGRST116)
- `500`: DB 오류

---

### GET `/api/hotel/search` & POST `/api/hotel/search`

호텔 검색. Sabre ID(숫자만), 한글명, 영문명 각각 쿼리 후 병합·정렬.  
빈 검색어면 `id_old` 내림차순 목록.

**GET Query / POST Body**

- `q` 또는 `searching_string`: 검색어
- `limit`: 기본 20
- `offset`: 기본 0

**Response**

- `200`: `{ success: true, data: hotel[], meta: { count, limit, offset } }`
- `500`: 서버 오류

---

### GET `/api/hotel/suggest`

자동완성 제안. `field`: `eng` | `kor` | `all`, `q`: 검색어, `limit`: 1~20 (기본 8).

**Response**

- `200`: `{ success: true, data: string[] }` (호텔명/Sabre ID 등)
- `500`: `{ success: false, error }`

---

### POST `/api/hotel/create`

호텔 신규 생성. Sabre ID 중복 시 409.

**Request Body**

```json
{
  "sabre_id": "string (required)",
  "hotel_data": "object (required, id/created_at 제외)"
}
```

**Response**

- `201`: `{ success: true, data, message }`
- `400`: sabre_id 또는 hotel_data 누락
- `409`: 동일 Sabre ID 존재
- `500`: DB 오류

---

### POST `/api/hotel/update`

호텔 기본 정보 + 브랜드(1/2/3) + 혜택 매핑 일괄 업데이트. FormData.

**FormData 주요 필드**

- `sabre_id`, `sabre_id_editable`
- `property_name_ko`, `property_name_en`, `property_address`
- `city_ko`, `city_en`, `country_ko`, `country_en`, `continent_ko`, `continent_en`
- `rate_plan_codes` (쉼표 구분 → `rate_code`로 저장)
- `brand_id`, `brand_id_2`, `brand_id_3`
- `mapped_benefit_id[]`, `mapped_sort__{id}`

**Response**

- `200`: `{ success: true, data: { sabre_id, brand_id, brand_id_2, brand_id_3 }, message }`
- `500`: `{ success: false, error }`

---

### POST `/api/hotel/update-benefits`

호텔별 혜택 매핑 전체 교체. 기존 매핑 삭제 후 `benefit_ids` 순서대로 insert.

**Request Body**

```json
{
  "sabre_id": "string (required)",
  "benefit_ids": "string[] (required, 빈 배열이면 삭제만)"
}
```

**Response**

- `200`: `{ success: true, message: "혜택 매핑이 저장되었습니다." }`
- `400`: sabre_id 누락 또는 benefit_ids 비배열
- `500`: DB 오류

---

### POST `/api/hotel/update-chain-brand`

호텔의 체인/브랜드 정보만 업데이트. `brand_position`으로 1/2/3 중 일부만 지정 가능.

**Request Body**

```json
{
  "sabre_id": "string (required)",
  "brand_id", "brand_id_2", "brand_id_3": "number | null",
  "brand_position": "1 | 2 | 3 (optional)"
}
```

**Response**

- `200`: `{ success: true, message }`
- `400`: sabre_id 누락
- `500`: DB 오류

---

### POST `/api/hotel/connect-chain-brand`

호텔에 체인/브랜드 연결. 호텔·체인·브랜드 존재 여부 검증 후 해당 슬롯(1/2/3)에 설정.

**Request Body**

```json
{
  "sabre_id": "string (required)",
  "chain_id": "required",
  "brand_id": "required",
  "brand_position": "1 | 2 | 3 (default: 1)"
}
```

**Response**

- `200`: `{ success: true, data: { sabre_id, chain_id, brand_id, brand_position, message } }`
- `400`: 필수 필드 누락
- `404`: 호텔/체인/브랜드 없음
- `500`: 업데이트 오류

---

### GET `/api/hotel/check-sabre-id?sabreId={sabreId}`

Sabre ID 존재 여부만 반환.

**Response**

- `200`: `{ success: true, data: { sabreId, exists: boolean } }`
- `400`: sabreId 없음
- `500`: 조회 오류

---

### GET `/api/hotel/slug?sabreId={sabreId}`

호텔의 sabre_id, 한/영 이름, slug 조회.

**Response**

- `200`: `{ success: true, data: { sabreId, nameKr, nameEn, slug } }`
- `400`: sabreId 없음
- `404`: 호텔 없음
- `500`: 서버 오류

---

### POST `/api/hotel/update-region-data`

호텔의 지역 관련 컬럼만 업데이트. 허용 필드:  
`area_code`, `area_ko`, `area_en`, `city_code`, `city_ko`, `city_en`,  
`country_code`, `country_ko`, `country_en`, `continent_code`, `continent_ko`, `continent_en`,  
`region_code`, `region_ko`, `region_en`.

**Request Body**

```json
{
  "sabre_id": "string (required)",
  "update_data": "object (allowed keys only)"
}
```

**Response**

- `200`: `{ success: true }`
- `400`: 필수 필드 누락 또는 유효 필드 없음
- `500`: DB 오류 (42703 시 컬럼 없음 메시지)

---

### GET `/api/hotel/rate-plan-codes?sabre_id={sabre_id}`

호텔의 요금 플랜 코드 목록 조회. **Authorization: Bearer {API_TOKEN}** 필요.

**Response**

- `200`: `{ success: true, data: string[] }`
- `401`: 토큰 없음/불일치
- `400`: sabre_id 없음
- `404`: 호텔 없음
- `500`: 서버 오류

---

### PATCH `/api/hotel/update-rate-plan-codes`

호텔의 rate_plan_code 업데이트. 허용 코드만 저장, enum 오류(22P02) 시 잘못된 값 제거 후 재시도.

**Request Body**

```json
{
  "sabre_id": "string (optional)",
  "paragon_id": "string (optional)",
  "rate_plan_code": "string[] (required)"
}
```

**Response**

- `200`: `{ success: true, data, count: 1 }`
- `400`: sabre_id/paragon_id 둘 다 없음, rate_plan_code 비배열, Invalid rate plan codes
- `404`: 호텔 없음
- `500`: DB 오류

---

### GET `/api/hotels/list`

전체 호텔 목록. Query: `rate_plan_filter` (all | has_codes | no_codes | specific_code), `rate_plan_code` (specific_code일 때).

**Response**

- `200`: `{ success: true, data: hotel[], meta: { count, filter, rate_plan_code? } }`
- `500`: 서버 오류

---

### GET `/api/hotel/images`, `/api/hotel/first-image`, `/api/hotel/save-image`, `/api/hotel/storage`, `/api/hotel/content`, `/api/hotel/room-url-rates`, `/api/hotel/search-address`, `/api/hotel/update-single`, `/api/hotel/update-images`, `/api/hotel/update-code`

호텔 이미지·콘텐츠·저장소·주소 검색·단일 필드 업데이트 등. 각각 해당 라우트 파일 참조.

---

### GET `/api/hotel/ihg-hotels`, POST `/api/hotel/ihg-bulk-daily-rates`

IHG 호텔 목록 및 벌크 일별 요금 처리. 별도 구현 참조.

---

## 4. 혜택 (Benefits)

### GET `/api/benefits/list` & GET `/api/benefits/manage/list`

혜택 마스터 목록. `select_hotel_benefits` 테이블, `benefit_id` 오름차순.

**Response**

- `200`: `{ success: true, data: BenefitRow[] }`
- `500`: `{ success: false, error }`

---

## 5. 지역 (Regions)

### GET `/api/regions`

지역 목록. 페이지네이션·타입·상태·검색·정렬 지원.

**Query**

- `page`, `pageSize` (기본 1, 20)
- `type`: region_type
- `status`: active | inactive
- `search`: 다중 필드 ilike
- `sortKey`, `sortOrder`

**Response**

- `200`: `{ success: true, data: SelectRegion[], meta: { count, page, pageSize, totalPages } }`
- `500`: createErrorResponse

---

### POST `/api/regions`

지역 생성. `region_type` 필수, 그 외 필드 정규화 후 insert.

**Request Body**: RegionFormInput (region_type, area_ko/en, city_ko/en, country_ko/en, continent_ko/en, region_name_ko/en, 각 sort_order 등)

**Response**

- `201`: `{ success: true, data: SelectRegion }`
- `400`: region_type 누락
- `500`: DB 오류

---

### PATCH `/api/regions?id={id}`

지역 수정.

**Response**

- `200`: `{ success: true, data: SelectRegion }`
- `400`: id 없음/무효
- `500`: DB 오류

---

### DELETE `/api/regions?id={id}`

지역 삭제.

**Response**

- `204`: No Content
- `400`: id 없음/무효
- `500`: DB 오류

---

## 6. 호텔 이미지 (Hotel Images)

### GET `/api/hotel-images/list?sabreId={sabreId}`

호텔 slug 기준 Storage `public/{slug}`, `originals/{slug}` 목록 조회. seq 추출·정렬.

**Response**

- `200`: `{ success: true, data: { hotel, images, totalImages, publicImages, originalsImages } }`
- `400`: sabreId 없음
- `404`: 호텔 없음
- `500`: 서버 오류

---

### POST `/api/hotel-images/upload`

FormData: `sabreId`, `file`. slug 기준 public/originals 양쪽 업로드, seq 자동 부여, `select_hotel_media` upsert.

**Response**

- `200`: `{ success: true, data: { fileName, filePath, url, storagePath, uploadResults }, message? }`
- `400`: sabreId/파일 없음, slug 없음
- `404`: 호텔 없음
- `500`: 업로드/DB 오류 (업로드만 성공 시 warning 포함 응답 가능)

---

### DELETE `/api/hotel-images/delete`

이미지 삭제. Body/Query로 경로 등 지정. Storage + DB 반영.

---

### POST `/api/hotel-images/reorder`, POST `/api/hotel-images/reorder/bulk`

이미지 순서 변경.

---

### POST `/api/hotel-images/sync-to-db`, `/api/hotel-images/sync-folders`, `/api/hotel-images/sync-storage-to-db`, `/api/hotel-images/rename`, `/api/hotel-images/import-from-details`, `/api/hotel-images/version`, `/api/hotel-images/migrate`, `/api/hotel-images/migrate-paths`, `/api/hotel-images/upload-from-urls`, `/api/hotel-images/content/extract`, `/api/hotel-images/content/migrate`, `/api/hotel-images/bulk/*`

동기화·이름 변경·버전·마이그레이션·벌크 등. 각 라우트 파일 참조.

---

## 7. 호텔 아티클 (Hotel Articles)

### GET `/api/hotel-articles`, POST `/api/hotel-articles`

목록 조회 및 생성. Query/ Body로 필터·페이징·생성 필드.

### GET `/api/hotel-articles/[id]`, PUT `/api/hotel-articles/[id]`, DELETE `/api/hotel-articles/[id]`

단건 조회·수정·삭제.

### GET `/api/hotel-articles/brands`, GET/POST `/api/hotel-articles/hotel-info`

브랜드 목록, 호텔 정보 조회/전달.

### POST `/api/hotel-articles/upload-main-image`

메인 이미지 업로드.

---

## 8. Sabre / 요금

### GET `/api/sabre/token`

Sabre 토큰 확인. 마스킹된 토큰 미리보기 반환.

**Response**

- `200`: `{ ok: true, token_preview: "masked" }`
- `500`: `{ ok: false, error }`

---

### GET `/api/sabre/hotel-details?sabre_id={sabre_id}`

Sabre 호텔 상세. 외부 프록시 호출 후 HotelInfo 반환. 실패 시 데모 데이터 반환 가능.

**Response**

- `200`: `{ success: true, data: { HotelDetailsInfo: { HotelInfo } }, error?: string }`
- `400`: sabre_id 없음
- `500`: 서버 오류

---

### GET `/api/sabre/hotel-rates`, POST `/api/sabre/hotel-rates`

호텔 요금 조회. hotelId, checkInDate, checkOutDate 필수. Sabre API 재시도 로직.

**Response**

- `200`: `{ success: true, data }`
- `400`: 필수 파라미터/날짜 형식 오류
- `408`: SUPPLIER_TIMEOUT
- `503`: VENDOR_ERROR
- `500`: 기타 오류

---

### GET `/api/sabre/db-search`

DB 기반 Sabre 검색. Query 파라미터에 따라 호텔 검색.

---

### POST `/api/sabre-id/search`

Sabre API 기반 호텔 검색. Body: `{ hotelName }`. 숫자면 코드로 직접 조회, 아니면 실시간 API 검색.

**Response**

- `200`: `{ success: true, data: SabreHotel[] }` 또는 `{ success: true, data: [], error }`
- `400`: hotelName 없음/짧음
- `500`: 서버 오류

---

### POST `/api/sabre-id/openai-search`

OpenAI 활용 호텔 검색. 별도 구현 참조.

---

### GET `/api/select-hotel-price`

**공개용 호텔 요금 조회.** CORS: `*.priviatravel.com`.  
Query: `sabre_id`, `check_in` (YYYY-MM-DD), `nights`, `number_of_people` 필수.  
`rate_plan_code`로 ExactMatchOnly 결정 후 외부 Sabre 프록시 호출, Room×RatePlan 변환 후 반환.

**Response**

- `200`: `{ success: true, data: { propertyNameKor, propertyNameEng, sabreId, roomDescriptions, ... }, search_info }`
- `400`: 필수/형식/과거날짜/숙박일/인원 검증 실패
- `404`: 호텔 없음, 객실 없음
- `422`: rate_plan_code 미설정
- `503`: DB 오류
- `504`: 타임아웃
- `500`: 기타 오류

---

## 9. 대시보드 / 프로모션 / 기타

### GET `/api/dashboard/stats`

대시보드 통계. 체인/브랜드/호텔 수, Sabre ID 누락, 체인·브랜드 미연결, 혜택 미매핑, 소개/블로그 아티클 누락 등.

**Response**

- `200`: `{ success: true, data: { totalHotels, chainCount, brandCount, missingSabreId, missingChainBrand, missingBenefits, missingIntroArticle, missingBlogArticle } }`
- `500`: 서버 오류

---

### GET `/api/promo-banners/list`, POST `/api/promo-banners/create`, PUT `/api/promo-banners/update`, DELETE `/api/promo-banners/delete`

프로모션 배너 목록(현재 빈 배열 반환)·생성·수정·삭제.

---

### GET/POST `/api/promotion-slots`, GET/PUT/DELETE `/api/promotion-slots/[id]`

프로모션 슬롯 CRUD.

---

### GET `/api/feature-slots`, GET `/api/feature-slots/banner`

피처 슬롯·배너 조회.

---

### GET `/api/rate-plan-codes`

허용 Rate Plan 코드 목록 (설정/enum 기반).

---

### GET `/api/satisfaction-survey/list`, POST `/api/satisfaction-survey/bulk-update-sort`

만족도 설문 목록 및 정렬 일괄 변경.

---

### GET `/api/login-images`, GET `/api/city-images/list`, GET `/api/city-images/first`, POST `/api/city-images/upload`, POST `/api/city-images/batch`, DELETE `/api/city-images/delete`

로그인/도시 이미지 목록·첫 이미지·업로드·배치·삭제.

---

### GET `/api/brand-image/[brandName]`

브랜드 이미지 반환 (public 파일 등).

---

### GET `/api/airports`

공항 목록. Query 파라미터에 따라 필터.

---

### GET `/api/hotel-seo-intro/fetch`

호텔 SEO 소개 fetch. Query: sabre_id 등.

---

### GET `/api/facility-proposal/stats`, `/api/facility-proposal/analytics`, `/api/facility-proposal/brand-traffic`

시설 제안 통계·분석·브랜드 트래픽.

---

### GET `/api/openai/health`

OpenAI 연동 상태 확인.

---

### POST `/api/users/confirm-email`, POST `/api/users/confirm-all-emails`, GET `/api/users/[id]/activity`

이메일 확인·일괄 확인·사용자 활동 로그.

---

## 10. 데이터 마이그레이션

### POST `/api/data-migration/upsert-hotel`, POST `/api/data-migration/batch-upsert-hotel`

호텔 upsert·배치 upsert.

### POST `/api/data-migration/parse-csv`, POST `/api/data-migration/import`, GET `/api/data-migration/export`

CSV 파싱·임포트·내보내기.

### POST `/api/data-migration/extract-location`, POST `/api/data-migration/bulk-location-migration`

위치 추출·일괄 지역 마이그레이션.

### POST `/api/data-migration/migrate`, `/api/data-migration/migrate-blog-images`, `/api/data-migration/migrate-blog-section-images`

마이그레이션·블로그 이미지/섹션 이미지 마이그레이션.

---

## 11. 테스트 / 유틸

### GET `/api/test/route`, POST `/api/test/route`

테스트용 핸들러.

### GET `/api/test/supabase`, GET `/api/test/table-schema`, GET `/api/test/table-schema-detailed`

Supabase 연결·테이블 스키마 조회.

### GET `/api/test/hotel-media-schema`, GET `/api/test/city-media-schema`, GET `/api/test/hotel-data`

호텔/도시 미디어 스키마·호텔 데이터 조회.

---

### Hashtags

- GET `/api/hashtags/tags`, GET `/api/hashtags/categories`
- POST `/api/hashtags/generate-slug`, POST `/api/hashtags/generate-description`
- POST `/api/hashtags/extract`, POST `/api/hashtags/cleanup`

해시태그 목록·카테고리·슬러그/설명 생성·추출·정리.

---

### Hotel Content

- PATCH/GET `/api/hotel/content`
- POST `/api/hotel/content/upload-image`
- POST `/api/hotel/content/extract-wordpress`

호텔 콘텐츠 수정·조회·이미지 업로드·워드프레스 추출.

---

이 명세서는 `src/app/api/**/route.ts` 구현을 기준으로 작성되었으며, 세부 파라미터/에러 메시지는 실제 라우트 코드를 참조하는 것을 권장합니다.
