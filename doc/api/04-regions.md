# 지역 API 상세 명세

## 1. 지역 목록 조회

### `GET /api/regions`

지역(select_regions) 목록을 페이지네이션·필터·정렬하여 조회합니다.

---

#### 요청

**Query**

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| page | number | X | 1 | 페이지 번호 |
| pageSize | number | X | 20 | 페이지 크기 |
| type | string | X | - | region_type (city \| area \| country \| continent \| region) |
| search | string | X | - | 검색어 (area_ko/en, city_ko/en, country_ko/en, continent_ko/en, region_name_ko/en ilike) |
| status | string | X | - | active \| inactive |
| sortKey | string | X | id | 정렬 키 |
| sortOrder | string | X | asc | asc \| desc |

**검증**

- type별로 city_sort_order, area_sort_order, country_sort_order, continent_sort_order, region_name_sort_order 등으로 정렬.
- status 우선 정렬 후 type별 sort_order, 마지막 id 내림차순.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "region_type": "city",
      "area_ko": "...",
      "area_en": "...",
      "city_ko": "...",
      "city_en": "...",
      "country_ko": "...",
      "country_en": "...",
      "continent_ko": "...",
      "continent_en": "...",
      "region_name_ko": "...",
      "region_name_en": "...",
      "area_sort_order": null,
      "city_sort_order": 1,
      "country_sort_order": 1,
      "continent_sort_order": 1,
      "region_name_sort_order": 1,
      "status": "active",
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "meta": {
    "count": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

**500 Internal Server Error** — createErrorResponse('지역 목록 조회에 실패했습니다.', 'INTERNAL_ERROR')

**캐시**: Cache-Control: no-store

---

## 2. 지역 생성

### `POST /api/regions`

새 지역 레코드를 insert합니다. region_type 필수.

---

#### 요청

**Body (JSON)** — RegionFormInput

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| region_type | string | O | city \| area \| country \| continent \| region |
| area_ko | string | X | trim, 빈 문자열 → null |
| area_en | string | X | trim, 빈 문자열 → null |
| area_sort_order | string | X | text 타입이면 normalizeString |
| city_ko | string | X | trim → null |
| city_en | string | X | trim → null |
| city_sort_order | number | X | 무효 시 null |
| country_ko | string | X | trim → null |
| country_en | string | X | trim → null |
| country_sort_order | number | X | 무효 시 null |
| continent_ko | string | X | trim → null |
| continent_en | string | X | trim → null |
| continent_sort_order | number | X | 무효 시 null |
| region_name_ko | string | X | trim → null |
| region_name_en | string | X | trim → null |
| region_name_sort_order | number | X | 무효 시 null |

**검증**

- region_type 없음 → 400.

---

#### 응답

**201 Created**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "region_type": "city",
    "area_ko": null,
    "area_en": null,
    "city_ko": "서울",
    "city_en": "Seoul",
    "...": "..."
  }
}
```

**400 Bad Request** — region_type은 필수 (VALIDATION_ERROR)  
**500 Internal Server Error** — 생성 실패 (INTERNAL_ERROR)

---

## 3. 지역 수정

### `PATCH /api/regions?id={id}`

지역 레코드를 수정합니다.

---

#### 요청

**Query**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | number | O | 지역 PK (유효한 양수) |

**Body (JSON)** — RegionFormInput (생성과 동일 필드)

**검증**

- id 없거나 0 이하 → 400.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "region_type": "city",
    "updated_at": "ISO8601",
    "...": "..."
  }
}
```

**400 Bad Request** — 유효한 id 필요  
**500 Internal Server Error** — 수정 실패

---

## 4. 지역 삭제

### `DELETE /api/regions?id={id}`

지역 레코드를 삭제합니다.

---

#### 요청

**Query**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | number | O | 지역 PK (유효한 양수) |

**검증**

- id 없거나 0 이하 → 400.

---

#### 응답

**204 No Content** — 본문 없음

**400 Bad Request** — 유효한 id 필요  
**500 Internal Server Error** — 삭제 실패

---

이 문서는 `src/app/api/regions/route.ts` 구현을 기준으로 작성되었습니다.
