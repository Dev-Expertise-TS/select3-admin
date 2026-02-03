# 호텔 아티클(블로그) API 상세 명세

테이블: `select_hotel_blogs`

## 1. 호텔 블로그 목록 조회

### `GET /api/hotel-articles`

호텔 블로그(아티클) 목록을 페이지네이션·검색·발행 상태 필터로 조회합니다.

---

#### 요청

**Query**

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| page | number | X | 1 | 페이지 |
| limit | number | X | 20 | 페이지 크기 |
| search | string | X | "" | main_title, sub_title ilike 검색 |
| publish | string | X | "" | true/false 시 발행 상태 필터 |

**검증**

- 없음.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "slug": "...",
      "publish": true,
      "main_title": "...",
      "sub_title": "...",
      "main_image": "...",
      "brand_id_connect": "...",
      "s1_contents": "...",
      "updated_at": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**500 Internal Server Error**

---

## 2. 호텔 블로그 생성(Upsert)

### `POST /api/hotel-articles`

slug 기준 upsert로 호텔 블로그를 생성 또는 업데이트합니다.

---

#### 요청

**Body (JSON)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| slug | string | X | upsert 키 |
| publish | boolean | X | 기본 false |
| main_title | string | X | 메인 제목 |
| sub_title | string | X | 서브 제목 |
| main_image | string | X | 메인 이미지 URL |
| brand_id_connect | string/array | X | 연결 브랜드 ID |
| s1_contents ~ s12_contents | string | X | 섹션 콘텐츠 |
| s1_sabre_id ~ s10_sabre_id | string | X | 섹션별 호텔 Sabre ID |
| 기타 컬럼 | - | X | 테이블 스키마 참조 |

**검증**

- 구현에 따라 필수 필드 상이.

---

#### 응답

**200 OK / 201 Created** — success: true, data: 생성/수정된 행  
**400 Bad Request** — 검증 실패  
**500 Internal Server Error**

---

## 3. 호텔 블로그 단건 조회

### `GET /api/hotel-articles/[id]`

경로 파라미터 `id`로 블로그를 조회합니다. Query에 `slug`가 있으면 id+slug 복합 조건으로 single 조회합니다.

---

#### 요청

**Path**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | string | O | 블로그 ID |

**Query**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| slug | string | X | 있으면 id+slug로 single 조회 |

**검증**

- id 없음 → 400.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": { "id": 1, "slug": "...", "main_title": "...", "..." }
}
```

slug 없이 조회 시 data가 배열일 수 있음.

**400 Bad Request** — 블로그 ID 필요  
**404 Not Found** — 호텔 블로그를 찾을 수 없음  
**500 Internal Server Error**

---

## 4. 호텔 블로그 수정

### `PUT /api/hotel-articles/[id]`

지정 id의 블로그를 수정합니다.

---

#### 요청

**Path**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | string | O | 블로그 ID |

**Body (JSON)** — 수정할 필드만 전송. slug, publish, main_title, sub_title, main_image, brand_id_connect, s1_contents~s12_contents, s1_sabre_id~s10_sabre_id, updated_at 등.

**검증**

- id 없음 → 400.

---

#### 응답

**200 OK** — success: true, data: 수정된 행  
**400 Bad Request** — ID 필요  
**404 Not Found** — 대상 없음  
**500 Internal Server Error**

---

## 5. 호텔 블로그 삭제

### `DELETE /api/hotel-articles/[id]`

지정 id의 블로그를 삭제합니다.

---

#### 요청

**Path**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | string | O | 블로그 ID |

**Query** — slug 등 복합키인 경우 구현에 따라 필요.

**검증**

- id 없음 → 400.

---

#### 응답

**200 OK** — success: true 또는 204 No Content  
**400 Bad Request** — ID 필요  
**404 Not Found** — 대상 없음  
**500 Internal Server Error**

---

## 6. 브랜드 목록 조회

### `GET /api/hotel-articles/brands`

블로그에서 사용하는 브랜드 목록 등을 조회합니다.

---

#### 요청

- Query/Body 없음.

---

#### 응답

**200 OK** — success: true, data: 브랜드 배열  
**500 Internal Server Error**

---

## 7. 호텔 정보 조회/전달

### `GET /api/hotel-articles/hotel-info`  
### `POST /api/hotel-articles/hotel-info`

호텔 정보 조회 또는 블로그와 연동할 호텔 정보 전달.

---

#### 요청

**GET** — Query: sabre_id 등.  
**POST** — Body: 호텔 정보 객체.

---

#### 응답

**200 OK** — success: true, data  
**400/404/500** — 구현 참조.

---

## 8. 메인 이미지 업로드

### `POST /api/hotel-articles/upload-main-image`

블로그 메인 이미지를 업로드합니다.

---

#### 요청

**Content-Type**: `multipart/form-data` 또는 JSON(image URL).

**FormData / Body** — file 또는 image URL 등. 구현 참조.

---

#### 응답

**200 OK** — success: true, data: { url } 등  
**400/500** — 검증/서버 오류

---

이 문서는 `src/app/api/hotel-articles/**/route.ts` 구현을 기준으로 작성되었습니다.
