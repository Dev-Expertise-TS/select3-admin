# Select3 Admin 비즈니스 로직 설명서

이 문서는 Select3 Admin 프로젝트의 **도메인 용어**, **비즈니스 불변식**, **UX 규칙**, **데이터 처리·검증**, **핵심 플로우**를 정리한 비즈니스 로직 설명서입니다.

---

## 목차

1. [도메인 용어 (Domain Glossary)](#1-도메인-용어-domain-glossary)
2. [식별자 및 키](#2-식별자-및-키)
3. [비즈니스 불변식 (Business Invariants)](#3-비즈니스-불변식-business-invariants)
4. [UX 규칙 (주요 화면)](#4-ux-규칙-주요-화면)
5. [데이터 처리 및 검증](#5-데이터-처리-및-검증)
6. [에러 및 메시징](#6-에러-및-메시징)
7. [보안 및 준수 사항](#7-보안-및-준수-사항)
8. [비기능 요구사항](#8-비기능-요구사항)
9. [변경 관리](#9-변경-관리)
10. [핵심 비즈니스 플로우](#10-핵심-비즈니스-플로우)
11. [레포지토리·기능 레이어 로직](#11-레포지토리기능-레이어-로직)

---

## 1. 도메인 용어 (Domain Glossary)

| 용어 | 설명 | 테이블/개념 |
|------|------|-------------|
| **Hotel** | 숙박 시설 엔티티. Sabre ID를 주 식별자로 사용. 과거 Paragon ID는 UI 라우팅에서 deprecated. | `select_hotels` |
| **Benefit (Master)** | 고객 노출용 혜택 카탈로그 항목(이름/설명). | `select_hotel_benefits` |
| **Benefit Mapping** | 호텔(sabre_id)과 혜택(benefit_id)의 연결. 순서는 `sort`로 관리. | `select_hotel_benefits_map` |
| **Rate Plan Codes** | 가격/테스트에 쓰이는 코드 집합. **비어 있으면 DB에는 `null`로 저장** (빈 배열 `[]` 아님). | `select_hotels.rate_plan_code` (TEXT, 콤마 구분) |
| **Chain / Brand** | 호텔 체인·브랜드. 호텔은 브랜드 1/2/3 슬롯에 연결 가능. | `hotel_chains`, `hotel_brands`, `select_hotels.brand_id(_2)(_3)` |
| **Region** | 지역(도시/국가/대륙/지역명 등). 타입별 sort_order로 정렬. | `select_regions` |
| **Sabre ID** | 호텔의 표준 식별자. UI·API·매핑의 기준 키. | `select_hotels.sabre_id` |

---

## 2. 식별자 및 키

- **Sabre ID**: UI·API·매핑의 **표준 호텔 키**. 라우팅·조회·업데이트 모두 Sabre ID 기준.
- **Paragon ID**: 편집/라우팅에는 사용하지 않음. 읽기 전용으로만 유지.
- **Benefit Mapping**: `(sabre_id, benefit_id)` 유일성 + **정수 `sort`** (0..N-1 연속).
- **Region**: `id` (PK)로 CRUD. `region_type` 등으로 필터·정렬.

---

## 3. 비즈니스 불변식 (Business Invariants)

1. **혜택 마스터**
   - 혜택 목록(마스터)은 매핑 유효성의 기준. 매핑은 반드시 존재하는 `benefit_id`만 참조.

2. **혜택 매핑 업데이트**
   - 특정 `sabre_id`에 대한 매핑 갱신 시 **전체 삭제 후 새 목록 insert**로 일괄 교체.
   - 정렬 값 `sort`는 **0부터 N-1까지 연속**으로 저장.

3. **날짜**
   - 날짜는 ISO **YYYY-MM-DD**.
   - 테스터 UI: **End Date = Start Date + 1일** 기본 규칙 적용.

4. **빈 값**
   - 폼/API에서 빈 문자열은 스키마가 nullable이면 **`null`로 저장**.
   - Rate Plan Codes가 비어 있으면 **`null`** (빈 배열 아님).

5. **Rate Plan Codes**
   - 허용 코드 목록(`config/rate-plan-codes`)에 있는 값만 저장.
   - DB에는 **콤마 구분 문자열** 또는 enum 스키마에 따라 저장. enum 오류(22P02) 시 잘못된 코드 제거 후 재시도.

6. **호텔·체인·브랜드**
   - 호텔 존재 여부, 체인/브랜드 존재 여부 검증 후 연결.
   - 브랜드 1/2/3 슬롯에 대해 `brand_id` + `brand_name_kr`/`brand_name_en` 등 denormalized 필드 동기화.

---

## 4. UX 규칙 (주요 화면)

### 호텔 검색

- 단일 검색 입력. **한글명·영문명·Sabre ID** 통합 자동완성.
- 키보드: **Arrow Up/Down** 이동, **Enter** 제출, **Escape** 닫기.
- 검색 실행 또는 바깥 클릭 시 자동완성 닫힘.

### 호텔 상세 테스터

- 입력 레이아웃은 테스트 전후 **동일 유지**.
- RatePlan 테이블: 주요 금액 필드 표시, **AmountAfterTax 기준 정렬**, RateKey는 **축약 표시**.
- **"JSON Copy"** 제공, 복사 성공 시 짧은 시각적 피드백.

### 호텔 수정 (상세)

- **Sabre ID**, **호텔명(한/영)** 편집 가능. 한 줄 3열(sm 이상).
- **Benefits Manager**
  - 팝업에서 다중 선택 → 읽기 전용 테이블에 추가, **드래그 앤 드롭으로 순서 변경**.
  - 드래그 시 **핑크**, 드롭 시 **블루**, 저장 성공 후 **노란 하이라이트**.
  - 저장 확인 모달: **"변경 사항을 저장하였습니다."** + 중앙 OK(취소 없음).
  - **혜택만 바뀌어도** 별도 조건 없이 제출·저장 가능.

### 기타

- 파괴적 작업(삭제 등)은 **확인 후 실행**.
- 비동기 액션은 **로딩/비활성화** 상태로 피드백.

---

## 5. 데이터 처리 및 검증

### 자동완성(제안) API

- 검색어에 **쉼표 등이 포함될 수 있으므로** Supabase `or(...)`에 검색어를 그대로 넣지 않음.
- **Sabre ID(숫자)·한글명·영문명 각각 쿼리 후 결과 병합·중복 제거.**

### 업데이트 후 조회

- 업데이트 후 단건 조회 시 **`.single()`** 사용. 정렬 제약으로 인한 오류 방지.

### 정규화

- 빈 배열/빈 문자열은 DB 타입에 맞게 **`null`**로 정규화.
- 입력 기본값은 **문자열**로: `String(value ?? '')`.
- 날짜는 **`string | number | Date`**만 사용하고, `new Date(...)` 전에 타입 검사.

### Rate Plan Codes

- **허용 코드 목록**으로 검증.
- 입력: 공백 제거, 대문자, 허용 목록에 없는 값 제거, 중복 제거.
- DB 컬럼이 enum(단일)인 경우 잘못된 값 제거 후 **단일 값 fallback** 시도 가능.

### 지역(Regions)

- 문자열 필드: 빈 문자열 → `null`.
- 숫자 필드: 빈 문자열/무효 숫자 → `null`.
- `region_type` 필수. 타입별 sort_order 컬럼으로 정렬.

---

## 6. 에러 및 메시징

- API 에러는 **DB/시스템 내부 노출 없이** 사용자용 메시지로 변환.
- 공통 형태: **`{ success: false, error: string, code?: string, details?: object }`**.
- 클라이언트 확인 메시지(저장 완료 등)는 **명시적·일시적**으로 표시.

---

## 7. 보안 및 준수 사항

- **Service-role Supabase 클라이언트**는 **서버 전용** (`src/lib/supabase/server.ts`).
- 응답·로그에 **시크릿 포함 금지**. 민감 API는 **속도 제한** 권장.
- `/api/hotel/rate-plan-codes` 등 일부 API는 **Bearer API_TOKEN** 검증.

---

## 8. 비기능 요구사항

- **성능**: 자동완성·테스터는 **디바운스**, **AbortController로 이전 요청 취소**로 반응성 유지.
- **접근성**: 제안 목록·매니저 다이얼로그 **키보드 접근**, **포커스 링** 명확히.

---

## 9. 변경 관리

- 테이블/컬럼 이름 변경(예: `select_basic_benefits` → `select_hotel_benefits`) 시 **API·UI·가드** 전반에 일관 적용.
- 라우팅 변경(예: `[sabre_paragon]` → `[sabre]`) 시 deprecated 파라미터는 **무시 또는 리다이렉트** 처리.

---

## 10. 핵심 비즈니스 플로우

### 10.1 호텔 생성

1. `sabre_id` 중복 여부 확인.
2. 중복 없으면 `hotel_data` + `sabre_id`로 `select_hotels` insert.
3. 409: 동일 Sabre ID 이미 존재.

### 10.2 호텔 정보 업데이트 (기본 + 브랜드 + 혜택)

1. FormData에서 기본 정보·브랜드 1/2/3·rate_plan_codes·mapped_benefit_id(+ sort) 추출.
2. 브랜드 ID로 `hotel_brands`에서 한/영 이름 조회 → denormalized 필드 채움.
3. **updateHotelRow**: `select_hotels` 업데이트 (sabre_id 또는 paragon_id 기준).
4. 혜택 변경 시 **replaceBenefitMappings**:
   - 기존 sabre_id(원본)와 다른 경우 원본 sabre_id 매핑 삭제.
   - 대상 sabre_id 매핑 전부 삭제 후, 새 benefit_ids + sort로 insert.

### 10.3 혜택 매핑만 저장

1. `POST /api/hotel/update-benefits`: sabre_id, benefit_ids.
2. 해당 sabre_id의 `select_hotel_benefits_map` 전부 삭제.
3. benefit_ids 순서대로 (sabre_id, benefit_id, sort) insert. 빈 배열이면 삭제만.

### 10.4 체인/브랜드 연결

1. 호텔·체인·브랜드 존재 여부 검증.
2. `brand_position`(1/2/3)에 해당하는 슬롯에 brand_id + brand_name_kr/en 설정.
3. `connect-chain-brand`: 한 슬롯만. `update-chain-brand`: 1/2/3 일괄 또는 지정 슬롯만.

### 10.5 Rate Plan Codes 저장

1. 허용 코드 목록으로 검증·정규화(공백 제거, 대문자, 중복 제거).
2. DB 업데이트. enum 오류(22P02) 시 잘못된 코드 제거 후 재시도.
3. 스키마가 enum 단일 값인 경우 **첫 번째 허용 코드만** 저장하는 fallback 가능.

### 10.6 지역(Regions) CRUD

1. GET: type, status, search, sortKey, sortOrder, page, pageSize로 필터·정렬·페이징.
2. POST: region_type 필수, 그 외 필드 정규화 후 insert.
3. PATCH/DELETE: id 쿼리 파라미터로 대상 지정.

### 10.7 호텔 요금 조회 (select-hotel-price)

1. Query: sabre_id, check_in(YYYY-MM-DD), nights, number_of_people 필수.
2. 과거 날짜·숙박일(1–30)·인원(1–20) 검증.
3. DB에서 해당 호텔의 rate_plan_code 조회. 없으면 422.
4. ExactMatchOnly 플래그 결정(API, ZP3, VMC, TLC, H01, S72만 있으면 true).
5. 외부 Sabre 프록시 호출 후 Room×RatePlan 변환, 취소 마감일 등 계산.
6. CORS: `*.priviatravel.com`만 허용.

### 10.8 호텔 이미지 업로드

1. sabreId로 호텔 slug 조회.
2. public/{slug}, originals/{slug} 기존 파일에서 사용 중인 seq 수집.
3. 다음 빈 seq로 파일명 생성: `{slug}_{sabreId}_{seq}.{ext}`.
4. public·originals 양쪽에 업로드(충돌 시 seq 증가 재시도).
5. `select_hotel_media`에 sabre_id, file_path, public_url 등 upsert.

---

## 11. 레포지토리·기능 레이어 로직

### 11.1 `features/hotels/lib/repository.ts`

- **getHotelBySabreOrParagon(sabreId, paragonId)**  
  - `select_hotels` 단건 조회.  
  - `brand_id` 있으면 `hotel_brands` → `hotel_chains` 조인해 chain/brand 이름 채움.  
  - `rate_plan_code`를 배열로 파싱해 **rate_plan_codes**로 반환(UI 호환).

- **getMappedBenefitsBySabreId(sabreId)**  
  - `select_hotel_benefits_map`에서 benefit_id, sort 조회 후 sort 순서로 정렬.  
  - 해당 benefit_id들로 `select_hotel_benefits` 조회 후 **sort 순서 유지**해 반환.

- **updateHotelRow({ sabreId, paragonId }, updateData)**  
  - `chain_id` 등 테이블에 없는 키 제거.  
  - sabre_id 또는 paragon_id로 `select_hotels` update 후 `.single()`로 반환.

- **replaceBenefitMappings({ originalSabreId, targetSabreId, mappedIds, sortMap })**  
  - originalSabreId ≠ targetSabreId면 원본 sabre_id 매핑 삭제.  
  - targetSabreId 매핑 전부 삭제 후 mappedIds + sortMap으로 insert.

### 11.2 Rate Plan 검증 (`lib/rate-plan-validator.ts`)

- **getAllowedRatePlanCodes()**: 설정된 허용 코드 배열 반환.
- **validateAndNormalizeRatePlanCodes(inputCodes, allowedCodes)**  
  - 배열 검증, 문자열 trim·대문자, JSON 잔여 문자 제거, 허용 목록 필터, 중복 제거.  
  - 정규화된 문자열(콤마 구분) 또는 null 반환.
- **removeInvalidCode**, **getFirstValidCode**: enum 오류 시 특정 코드 제거·첫 번째 유효 코드 반환.

### 11.3 API 유틸 (`lib/api-utils.ts`, `types/api.ts`)

- **createApiSuccessResponse** / **createApiErrorResponse**: 표준 JSON 응답 생성.
- **transformSupabaseError**: PGRST116→404, 23505→409, 23503→422, 22P02→400 등 매핑.
- **createSuccessResponse** / **createErrorResponse**: meta(count, page, pageSize, totalPages) 포함 가능.
- **API_ERROR_CODES**: VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, CONFLICT, INTERNAL_ERROR 등.

### 11.4 기타 기능 레이어

- **features/benefits/actions.ts**: 혜택 목록·매핑 저장 시 API 호출.
- **features/chain-brand/actions.ts**: 체인/브랜드 연결·업데이트 API 호출.
- **features/regions/actions.ts**: 지역 CRUD API 호출.
- **features/satisfaction-survey/actions.ts**: 만족도 설문 목록·정렬 API 호출.
- **features/hotel-images/actions.ts**: 호텔 이미지 목록·업로드·삭제·재정렬 등 API 호출.

---

이 문서는 `.cursor/rules/business-context.mdc`, `src/features/**`, `src/lib/**` 구현을 기준으로 작성되었습니다. 세부 규칙은 해당 소스와 API 명세서(`doc/API-SPEC.md`)를 함께 참조하는 것을 권장합니다.
