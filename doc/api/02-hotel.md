# 호텔 API 상세 명세

## 1. 호텔 단건 조회

### `GET /api/hotel/get`

Sabre ID로 `select_hotels` 테이블에서 호텔 단건을 조회합니다.

---

#### 요청

**Query**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sabre_id | string | O | 호텔 Sabre ID |

**검증**

- sabre_id 없음 → 400.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "sabre_id": "313016",
    "property_name_ko": "호텔명",
    "property_name_en": "Hotel Name",
    "property_address": "...",
    "rate_plan_code": "API,ZP3",
    "paragon_id": "...",
    "brand_id": 1,
    "slug": "...",
    "...": "..."
  }
}
```

**400 Bad Request** — Sabre ID 필요  
**404 Not Found** — 해당 Sabre ID 호텔 없음 (PGRST116)  
**500 Internal Server Error**

---

## 2. 호텔 검색

### `GET /api/hotel/search`  
### `POST /api/hotel/search`

Sabre ID(숫자만), 한글명, 영문명 각각 쿼리 후 결과 병합·정렬합니다. 빈 검색어면 `id_old` 내림차순 목록을 반환합니다.

---

#### 요청

**GET — Query**

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| q | string | X | "" | 검색어 |
| limit | number | X | 20 | 페이지 크기 |
| offset | number | X | 0 | 오프셋 |

**POST — Body (JSON)**

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| q | string | X | "" | 검색어 (또는 searching_string) |
| searching_string | string | X | - | q 대체 |
| limit | number | X | 20 | 페이지 크기 |
| offset | number | X | 0 | 오프셋 |

**검증**

- 없음 (빈 q 허용).

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": [
    {
      "sabre_id": "313016",
      "property_name_ko": "호텔명",
      "property_name_en": "Hotel Name",
      "property_address": "...",
      "rate_plan_code": "API,ZP3",
      "paragon_id": "...",
      "brand_id": 1,
      "hotel_brands": { "brand_id": 1, "brand_name_ko": "...", "hotel_chains": { "chain_id": 1, "chain_name_ko": "..." } },
      "slug": "..."
    }
  ],
  "meta": {
    "count": 100,
    "limit": 20,
    "offset": 0
  }
}
```

**500 Internal Server Error**

---

## 3. 호텔 자동완성 제안

### `GET /api/hotel/suggest`

호텔명·Sabre ID 자동완성용 제안 문자열 배열을 반환합니다.  
`field=all`이면 영문/한글명 모두에서 제안 수집하고, 숫자 입력 시 Sabre ID 일치 항목을 포함합니다.

---

#### 요청

**Query**

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| field | string | X | eng | eng \| kor \| all |
| q | string | X | "" | 검색어 (trim). 빈 값이면 빈 배열 반환 |
| limit | number | X | 8 | 1~20, 제안 개수 상한 |

**검증**

- q 빈 값 → 200, data: [].

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": ["Hotel Name A", "Hotel Name B", "313016"]
}
```

**500 Internal Server Error** — `success: false`, `error`

---

## 4. 호텔 생성

### `POST /api/hotel/create`

새 호텔 레코드를 `select_hotels`에 삽입합니다. Sabre ID 중복 시 409를 반환합니다.

---

#### 요청

**Body (JSON)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sabre_id | string | O | 호텔 Sabre ID |
| hotel_data | object | O | 호텔 컬럼 데이터 (id, created_at 제외) |

**검증**

- sabre_id 없음 → 400.
- hotel_data 없음 또는 빈 객체 → 400.
- 동일 sabre_id 이미 존재 → 409.

---

#### 응답

**201 Created**

```json
{
  "success": true,
  "data": { "sabre_id": "313016", "property_name_ko": "...", "..." },
  "message": "호텔 데이터가 성공적으로 생성되었습니다"
}
```

**400 Bad Request** — Sabre ID 또는 호텔 데이터 필요  
**409 Conflict** — 동일 Sabre ID 이미 존재  
**500 Internal Server Error** — DB 오류(unique 위반 시 409로 매핑)

---

## 5. 호텔 정보 업데이트 (기본 + 브랜드 + 혜택)

### `POST /api/hotel/update`

호텔 기본 정보, 브랜드 1/2/3, Rate Plan Codes, 혜택 매핑을 **FormData**로 일괄 업데이트합니다.  
`updateHotelRow` + `replaceBenefitMappings` 사용.

---

#### 요청

**Content-Type**: `multipart/form-data` (FormData)

**FormData 필드**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sabre_id | string | O | 대상 호텔 Sabre ID |
| sabre_id_editable | string | X | 수정된 Sabre ID(변경 시) |
| property_name_ko | string | X | 호텔명(한) |
| property_name_en | string | X | 호텔명(영) |
| property_address | string | X | 주소 |
| city_ko, city_en | string | X | 도시 |
| country_ko, country_en | string | X | 국가 |
| continent_ko, continent_en | string | X | 대륙 |
| rate_plan_codes | string | X | 쉼표 구분 → rate_code로 저장 |
| brand_id | string | X | 숫자 또는 빈 문자열 |
| brand_id_2 | string | X | 숫자 또는 빈 문자열 |
| brand_id_3 | string | X | 숫자 또는 빈 문자열 |
| mapped_benefit_id | string[] | X | 혜택 ID 목록 (getAll) |
| mapped_sort__{id} | string | X | benefit_id별 sort 값 |

**검증**

- 브랜드 ID는 `hotel_brands`에서 이름 조회 후 denormalized 필드(brand_name_kr/en 등) 동기화.
- 혜택은 기존 매핑 삭제 후 새 목록으로 insert.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "sabre_id": "313016",
    "brand_id": 1,
    "brand_id_2": null,
    "brand_id_3": null
  },
  "message": "호텔 정보가 성공적으로 저장되었습니다."
}
```

**500 Internal Server Error** — updateHotelRow 또는 replaceBenefitMappings 실패

---

## 6. 혜택 매핑 업데이트

### `POST /api/hotel/update-benefits`

특정 호텔(sabre_id)의 혜택 매핑을 **전체 교체**합니다. 기존 매핑 삭제 후 benefit_ids 순서대로 insert합니다.

---

#### 요청

**Body (JSON)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sabre_id | string | O | 호텔 Sabre ID |
| benefit_ids | string[] | O | 혜택 ID 배열. 빈 배열이면 삭제만 수행 |

**검증**

- sabre_id 없음 → 400.
- benefit_ids가 배열이 아님 → 400.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "message": "혜택 매핑이 저장되었습니다."
}
```

**400 Bad Request** — Sabre ID 필수, benefit_ids는 배열  
**500 Internal Server Error** — 삭제/insert 실패

**캐시**: `revalidatePath('/admin/hotel-update')`, `revalidatePath('/admin/hotel-update/{sabre_id}')`

---

## 7. 체인/브랜드 정보 업데이트

### `POST /api/hotel/update-chain-brand`

호텔의 체인·브랜드 정보만 업데이트합니다. brand_position으로 1/2/3 중 일부만 지정 가능합니다.

---

#### 요청

**Body (JSON)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sabre_id | string | O | 호텔 Sabre ID |
| brand_id | number \| null | X | 브랜드 1 |
| brand_id_2 | number \| null | X | 브랜드 2 |
| brand_id_3 | number \| null | X | 브랜드 3 |
| brand_position | 1 \| 2 \| 3 | X | 지정 시 해당 슬롯만 업데이트 |

**검증**

- sabre_id 없음 → 400.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "message": "체인/브랜드 정보가 저장되었습니다."
}
```

**500 Internal Server Error**

**캐시**: revalidatePath 동일.

---

## 8. 체인/브랜드 연결

### `POST /api/hotel/connect-chain-brand`

호텔에 체인·브랜드를 연결합니다. 호텔·체인·브랜드 존재 여부 검증 후 지정 슬롯(1/2/3)에 설정합니다.

---

#### 요청

**Body (JSON)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sabre_id | string | O | 호텔 Sabre ID |
| chain_id | number/string | O | 체인 ID |
| brand_id | number/string | O | 브랜드 ID |
| brand_position | 1 \| 2 \| 3 | X | 기본값 1 |

**검증**

- sabre_id, chain_id, brand_id 모두 필요 → 400.
- 호텔 없음 → 404.
- 체인 없음 → 404.
- 브랜드 없음 → 404.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "sabre_id": "313016",
    "chain_id": 1,
    "brand_id": 1,
    "brand_position": 1,
    "message": "호텔이 브랜드1로 성공적으로 연결되었습니다."
  }
}
```

**400 Bad Request** — 필수 필드 누락  
**404 Not Found** — 호텔/체인/브랜드 없음  
**500 Internal Server Error**

---

## 9. Sabre ID 존재 여부 확인

### `GET /api/hotel/check-sabre-id`

Sabre ID가 `select_hotels`에 존재하는지 여부만 반환합니다.

---

#### 요청

**Query**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sabreId | string | O | trim 적용 |

**검증**

- sabreId 없거나 trim 후 빈 값 → 400.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "sabreId": "313016",
    "exists": true
  }
}
```

**400 Bad Request** — sabreId 필요  
**500 Internal Server Error**

---

## 10. 호텔 Slug 조회

### `GET /api/hotel/slug`

호텔의 sabre_id, 한/영 이름, slug를 조회합니다.

---

#### 요청

**Query**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sabreId | string | O | 호텔 Sabre ID |

**검증**

- sabreId 없음 → 400.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "sabreId": "313016",
    "nameKr": "호텔명",
    "nameEn": "Hotel Name",
    "slug": "hotel-slug"
  }
}
```

**400 Bad Request** — sabreId 필요  
**404 Not Found** — 호텔 없음  
**500 Internal Server Error**

---

## 11. 지역 데이터 업데이트

### `POST /api/hotel/update-region-data`

호텔의 지역 관련 컬럼만 업데이트합니다. 허용 필드만 반영됩니다.

---

#### 요청

**Body (JSON)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sabre_id | string | O | 호텔 Sabre ID |
| update_data | object | O | 허용 키만 사용 |

**허용 키**: area_code, area_ko, area_en, city_code, city_ko, city_en, country_code, country_ko, country_en, continent_code, continent_ko, continent_en, region_code, region_ko, region_en

**검증**

- sabre_id 또는 update_data 없음 → 400.
- update_data가 객체가 아님 → 400.
- 허용 필드만 필터링 후 비어 있음 → 400.

---

#### 응답

**200 OK**

```json
{
  "success": true
}
```

**400 Bad Request** — 필수 필드 누락 또는 유효 필드 없음  
**500 Internal Server Error** — DB 오류 (42703 시 컬럼 없음 메시지)

**캐시**: revalidatePath('/admin/region-mapping'), hotel-search, hotel-update

---

## 12. Rate Plan Codes 조회

### `GET /api/hotel/rate-plan-codes`

호텔의 요금 플랜 코드 목록을 반환합니다. **Bearer 토큰 인증 필요.**

---

#### 요청

**Headers**

| 이름 | 필수 | 설명 |
|------|------|------|
| Authorization | O | Bearer {API_TOKEN} |

**Query**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sabre_id | string | O | 호텔 Sabre ID |

**검증**

- Authorization 없거나 API_TOKEN 불일치 → 401.
- sabre_id 없음 → 400.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": ["API", "ZP3", "VMC"]
}
```

**401 Unauthorized** — 인증 토큰 유효하지 않음  
**400 Bad Request** — sabre_id 필요  
**404 Not Found** — 해당 호텔 없음  
**500 Internal Server Error**

**캐시**: Cache-Control: no-store

---

## 13. Rate Plan Codes 업데이트

### `PATCH /api/hotel/update-rate-plan-codes`

호텔의 rate_plan_code를 업데이트합니다. 허용 코드만 저장하며, enum 오류(22P02) 시 잘못된 값 제거 후 재시도합니다.

---

#### 요청

**Body (JSON)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sabre_id | string | 조건부 | sabre_id 또는 paragon_id 중 하나 필수 |
| paragon_id | string | 조건부 | sabre_id 또는 paragon_id 중 하나 필수 |
| rate_plan_code | string[] | O | 허용 코드 배열 |

**검증**

- sabre_id·paragon_id 둘 다 없음 → 400.
- rate_plan_code가 배열이 아님 → 400.
- 허용 코드 목록(config/rate-plan-codes)에 없는 값 포함 시 400, details에 errors.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "sabre_id": "313016",
    "paragon_id": null,
    "property_name_ko": "...",
    "property_name_en": "...",
    "rate_plan_code": "API,ZP3"
  },
  "count": 1
}
```

**400 Bad Request** — 필수 필드 누락, Invalid rate plan codes  
**404 Not Found** — 호텔 없음  
**500 Internal Server Error**

**CORS**: Access-Control-Allow-Origin: *, PATCH, OPTIONS

---

## 14. 호텔 목록 (필터)

### `GET /api/hotels/list`

전체 호텔 목록을 조회합니다. rate_plan_filter로 필터링 가능합니다.

---

#### 요청

**Query**

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| rate_plan_filter | string | X | all | all \| has_codes \| no_codes \| specific_code |
| rate_plan_code | string | 조건부 | - | specific_code일 때 필수 |

**검증**

- rate_plan_filter가 specific_code인데 rate_plan_code 없음 → 필터만 적용 안 함(또는 전체).

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": [
    {
      "sabre_id": "313016",
      "property_name_ko": "...",
      "property_name_en": "...",
      "rate_plan_code": "API,ZP3",
      "brand_id": 1,
      "brand_id_2": null,
      "city_ko": "...",
      "country_ko": "...",
      "vcc": "...",
      "brand_name_ko": "...",
      "brand_id_2_name_ko": null
    }
  ],
  "meta": {
    "count": 100,
    "filter": "has_codes",
    "rate_plan_code": "API"
  }
}
```

**500 Internal Server Error**

---

## 15. 호텔 이미지(DB 컬럼) 조회

### `GET /api/hotel/images`

호텔의 DB 컬럼 image_1~image_5 등을 조회합니다. **Query 파라미터명은 sabreCode.**

---

#### 요청

**Query**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sabreCode | string | O | 호텔 Sabre ID |

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "sabre_id": "313016",
    "property_name_ko": "...",
    "property_name_en": "...",
    "image_1": "url",
    "image_2": "url",
    "image_3": "url",
    "image_4": "url",
    "image_5": "url"
  }
}
```

**400 Bad Request** — 호텔 코드 필요  
**404 Not Found** — 호텔 없음  
**500 Internal Server Error**

---

## 16. 기타 호텔 API (요약)

| Method | Path | 요약 |
|--------|------|------|
| GET | /api/hotel/first-image | 호텔 대표 이미지 URL 등 조회 |
| POST | /api/hotel/save-image | 호텔 이미지 URL 저장 |
| GET/POST | /api/hotel/storage | Storage 관련 조회/업로드 |
| GET/PATCH | /api/hotel/content | 호텔 콘텐츠 조회/수정 |
| POST | /api/hotel/content/upload-image | 콘텐츠 이미지 업로드 |
| POST | /api/hotel/content/extract-wordpress | 워드프레스 콘텐츠 추출 |
| POST | /api/hotel/room-url-rates | 객실 URL 요금 |
| POST | /api/hotel/search-address | 주소 검색 |
| PUT | /api/hotel/update-single | 단일 필드 업데이트 |
| PATCH | /api/hotel/update-images | 이미지 필드 업데이트 |
| POST | /api/hotel/update-code | 코드 업데이트 |
| GET | /api/hotel/ihg-hotels | IHG 호텔 목록 |
| POST | /api/hotel/ihg-bulk-daily-rates | IHG 벌크 일별 요금 |

세부 파라미터·응답은 해당 라우트 파일을 참조하세요.

---

이 문서는 `src/app/api/hotel/**/route.ts`, `src/app/api/hotels/**/route.ts` 구현을 기준으로 작성되었습니다.
