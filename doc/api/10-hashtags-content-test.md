# 해시태그 / 호텔 콘텐츠 / 테스트·유틸 API 상세 명세

## 1. 해시태그 목록

### `GET /api/hashtags/tags`

해시태그 목록을 조회합니다.

---

#### 요청

**Query** — 구현에 따라 필터(검색어, 카테고리 등).

---

#### 응답

**200 OK** — success: true, data: 태그 배열  
**500 Internal Server Error**

---

## 2. 해시태그 카테고리

### `GET /api/hashtags/categories`

해시태그 카테고리 목록을 조회합니다.

---

#### 요청

- Query 없거나 필터.

---

#### 응답

**200 OK** — success: true, data: 카테고리 배열  
**500 Internal Server Error**

---

## 3. 슬러그 생성

### `POST /api/hashtags/generate-slug`

제목 등에서 슬러그를 생성합니다.

---

#### 요청

**Body (JSON)** — title 또는 text 등. 구현 참조.

---

#### 응답

**200 OK** — success: true, data: { slug }  
**400/500** — 구현 참조.

---

## 4. 설명 생성

### `POST /api/hashtags/generate-description`

텍스트 또는 메타데이터로 설명 문구를 생성합니다.

---

#### 요청

**Body (JSON)** — 입력 필드. 구현 참조.

---

#### 응답

**200 OK** — success: true, data: { description }  
**400/500** — 구현 참조.

---

## 5. 해시태그 추출

### `POST /api/hashtags/extract`

콘텐츠에서 해시태그를 추출합니다.

---

#### 요청

**Body (JSON)** — content 또는 url 등. 구현 참조.

---

#### 응답

**200 OK** — success: true, data: 태그 배열  
**400/500** — 구현 참조.

---

## 6. 해시태그 정리

### `POST /api/hashtags/cleanup`

중복·무효 태그 정리 등 정리 작업을 수행합니다.

---

#### 요청

**Body (JSON)** — 옵션. 구현 참조. (없을 수 있음)

---

#### 응답

**200 OK** — success: true, data: 결과 요약  
**500 Internal Server Error**

---

## 7. 호텔 콘텐츠 조회

### `GET /api/hotel/content`

호텔 콘텐츠를 조회합니다. Query: sabre_id 등.

---

#### 요청

**Query** — sabre_id 등. 구현 참조.

---

#### 응답

**200 OK** — success: true, data: 콘텐츠 객체  
**400/404/500** — 구현 참조.

---

## 8. 호텔 콘텐츠 수정

### `PATCH /api/hotel/content`

호텔 콘텐츠를 수정합니다.

---

#### 요청

**Body (JSON)** — sabre_id, 수정할 필드. 구현 참조.

---

#### 응답

**200 OK** — success: true, data  
**400/404/500** — 구현 참조.

---

## 9. 호텔 콘텐츠 이미지 업로드

### `POST /api/hotel/content/upload-image`

호텔 콘텐츠용 이미지를 업로드합니다.

---

#### 요청

**Content-Type**: multipart/form-data 또는 JSON(image URL).

---

#### 응답

**200 OK** — success: true, data: { url } 등  
**400/500** — 구현 참조.

---

## 10. 워드프레스 콘텐츠 추출

### `POST /api/hotel/content/extract-wordpress`

워드프레스 URL 또는 HTML에서 콘텐츠를 추출합니다.

---

#### 요청

**Body (JSON)** — url 또는 html 등. 구현 참조.

---

#### 응답

**200 OK** — success: true, data: 추출된 콘텐츠  
**400/500** — 구현 참조.

---

## 11. 테스트 라우트

### `GET /api/test/route`  
### `POST /api/test/route`

테스트용 핸들러. 연결 확인 등.

---

#### 요청/응답

- GET/POST 각각 구현 참조. 성공 시 ok: true 등.

---

## 12. Supabase 연결 테스트

### `GET /api/test/supabase`

Supabase 연결 상태를 확인합니다.

---

#### 요청

- Query, Body 없음.

---

#### 응답

**200 OK** — 연결 성공 시 데이터 또는 메시지  
**500 Internal Server Error** — 연결 실패

---

## 13. 테이블 스키마 조회

### `GET /api/test/table-schema`  
### `GET /api/test/table-schema-detailed`

테이블 스키마를 조회합니다. Query로 테이블명 지정 가능.

---

#### 요청

**Query** — table 등. 구현 참조.

---

#### 응답

**200 OK** — success: true, data: 스키마 정보  
**500 Internal Server Error**

---

## 14. 호텔/도시 미디어 스키마

### `GET /api/test/hotel-media-schema`  
### `GET /api/test/city-media-schema`

호텔 미디어/도시 미디어 테이블 스키마를 조회합니다.

---

#### 요청/응답

- 구현 참조.

---

## 15. 호텔 데이터 테스트

### `GET /api/test/hotel-data`

테스트용 호텔 데이터를 조회합니다.

---

#### 요청

**Query** — sabre_id 등. 구현 참조.

---

#### 응답

**200 OK** — success: true, data  
**500 Internal Server Error**

---

이 문서는 `src/app/api/hashtags/**/route.ts`, `src/app/api/hotel/content/**/route.ts`, `src/app/api/test/**/route.ts` 구현을 기준으로 작성되었습니다.
