# 데이터 마이그레이션 API 상세 명세

## 1. 호텔 Upsert

### `POST /api/data-migration/upsert-hotel`

단일 호텔 레코드를 upsert합니다.

---

#### 요청

**Body (JSON)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sabre_id | string | O | 호텔 Sabre ID |
| hotel_data | object | O | select_hotels 컬럼 데이터 |

**검증**

- sabre_id 또는 hotel_data 없음 → 400.

---

#### 응답

**200 OK / 201 Created** — success: true, data: upsert된 행  
**400 Bad Request** — 필수 필드 누락  
**409 Conflict** — unique 위반 등  
**500 Internal Server Error**

---

## 2. 호텔 배치 Upsert

### `POST /api/data-migration/batch-upsert-hotel`

여러 호텔을 한 번에 upsert합니다.

---

#### 요청

**Body (JSON)** — hotels: array of { sabre_id, hotel_data } 등.

---

#### 응답

**200 OK** — success: true, data: 결과 요약 또는 배열  
**400/500** — 구현 참조.

---

## 3. CSV 파싱

### `POST /api/data-migration/parse-csv`

CSV 파일 또는 문자열을 파싱하여 구조화된 데이터로 반환합니다.

---

#### 요청

**Content-Type**: `multipart/form-data` 또는 application/json.

**Body** — file 또는 csv string. 구현에 따라 상이.

---

#### 응답

**200 OK** — success: true, data: 파싱 결과 (배열 또는 메타 포함)  
**400 Bad Request** — 파일/형식 오류  
**500 Internal Server Error**

---

## 4. 데이터 임포트

### `POST /api/data-migration/import`

파싱된 데이터를 DB에 임포트합니다.

---

#### 요청

**Body (JSON)** — rows 또는 data 배열, 옵션 등.

---

#### 응답

**200 OK** — success: true, data: 임포트 결과 (성공/실패 건수 등)  
**400/500** — 구현 참조.

---

## 5. 데이터 내보내기

### `GET /api/data-migration/export`

DB 데이터를 내보내기(CSV/JSON 등)합니다.

---

#### 요청

**Query** — 테이블명, 필터, 포맷 등. 구현 참조.

---

#### 응답

**200 OK** — 스트림 또는 JSON { success: true, data }  
**500 Internal Server Error**

---

## 6. 위치 추출

### `POST /api/data-migration/extract-location`

텍스트 또는 레코드에서 지역(도시/국가 등) 정보를 추출합니다.

---

#### 요청

**Body (JSON)** — text 또는 records. 구현 참조.

---

#### 응답

**200 OK** — success: true, data: 추출된 지역 정보  
**400/500** — 구현 참조.

---

## 7. 지역 일괄 마이그레이션

### `POST /api/data-migration/bulk-location-migration`

여러 레코드의 지역 데이터를 일괄 업데이트합니다.

---

#### 요청

**Body (JSON)** — 대상 목록, 매핑 규칙 등. 구현 참조.

---

#### 응답

**200 OK** — success: true, data: 결과 요약  
**400/500** — 구현 참조.

---

## 8. 마이그레이션 실행

### `POST /api/data-migration/migrate`

일반 마이그레이션 작업을 실행합니다.

---

#### 요청

**Body (JSON)** — 작업 유형, 옵션 등. 구현 참조.

---

#### 응답

**200 OK** — success: true, data  
**400/500** — 구현 참조.

---

## 9. 블로그 이미지 마이그레이션

### `POST /api/data-migration/migrate-blog-images`  
### `POST /api/data-migration/migrate-blog-section-images`

블로그 이미지 또는 블로그 섹션 이미지를 마이그레이션합니다.

---

#### 요청

**Body (JSON)** — 대상, 경로 규칙 등. 구현 참조.

---

#### 응답

**200 OK** — success: true, data: 결과 요약  
**400/500** — 구현 참조.

---

이 문서는 `src/app/api/data-migration/**/route.ts` 구현을 기준으로 작성되었습니다.
