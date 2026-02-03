# 호텔 이미지 API 상세 명세

## 1. 호텔 이미지 목록 조회

### `GET /api/hotel-images/list`

호텔 slug 기준 Supabase Storage의 `public/{slug}`, `originals/{slug}` 폴더 목록을 조회합니다.  
파일명에서 seq를 추출하여 정렬한 뒤 반환합니다.

---

#### 요청

**Query**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sabreId | string | O | 호텔 Sabre ID |

**검증**

- sabreId 없음 → 400.
- 호텔 없음 → 404.
- 호텔 slug 없음 → 400.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "hotel": {
      "sabreId": "313016",
      "nameKr": "호텔명",
      "nameEn": "Hotel Name",
      "slug": "hotel-slug",
      "normalizedSlug": "hotel-slug"
    },
    "images": [
      {
        "name": "hotel-slug_313016_01_1600w.avif",
        "url": "https://...",
        "seq": 1,
        "role": "main",
        "size": 12345,
        "createdAt": "...",
        "path": "public/hotel-slug/hotel-slug_313016_01_1600w.avif",
        "folder": "public"
      }
    ],
    "totalImages": 10,
    "publicImages": 5,
    "originalsImages": 5
  }
}
```

**400 Bad Request** — Sabre ID는 필수  
**404 Not Found** — 호텔 정보를 찾을 수 없음  
**500 Internal Server Error**

---

## 2. 호텔 이미지 업로드

### `POST /api/hotel-images/upload`

FormData로 파일을 전송하여 public·originals 양쪽에 업로드하고, `select_hotel_media`에 레코드를 upsert합니다.  
파일명 규칙: `{hotel_slug}_{sabreId}_{seq}.{ext}`. seq는 기존 파일 스캔 후 다음 빈 번호 사용.

---

#### 요청

**Content-Type**: `multipart/form-data`

**FormData**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sabreId | string | O | 호텔 Sabre ID |
| file | File | O | 이미지 파일 |

**검증**

- sabreId 또는 file 없음 → 400.
- 호텔 없음 → 404.
- 호텔 slug 없음 → 400.
- 충돌 시 seq 증가하여 최대 5회 재시도.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "fileName": "hotel-slug_313016_01.jpg",
    "filePath": "public/hotel-slug/hotel-slug_313016_01.jpg",
    "url": "https://...",
    "storagePath": "public/hotel-slug/hotel-slug_313016_01.jpg",
    "uploadResults": [
      { "folder": "public", "path": "...", "success": true },
      { "folder": "originals", "path": "...", "success": true }
    ]
  },
  "message": "이미지가 성공적으로 업로드되었습니다 (2/2 성공)."
}
```

**200 OK (업로드 성공, DB upsert 실패 시)**

```json
{
  "success": true,
  "warning": "이미지는 업로드되었지만 DB 레코드 upsert 실패: ...",
  "data": { "fileName": "...", "filePath": "...", "url": "...", "uploadResults": [...] }
}
```

**400 Bad Request** — Sabre ID와 파일은 필수  
**404 Not Found** — 호텔 정보를 찾을 수 없음  
**500 Internal Server Error** — 업로드 실패 또는 모든 업로드 실패

---

## 3. 호텔 이미지 삭제

### `DELETE /api/hotel-images/delete`

Storage의 public·originals 경로 및 DB(select_hotel_media)에서 이미지를 삭제합니다.

---

#### 요청

**Body (JSON)** 또는 **Query**

- sabreId, path(또는 file_path) 등. 구현에 따라 경로 지정 방식 상이.

**검증**

- 경로/대상 없음 → 400.

---

#### 응답

**200 OK** — 성공 시 success: true  
**400 Bad Request** — 필수 파라미터 누락  
**404 Not Found** — 대상 없음  
**500 Internal Server Error**

---

## 4. 호텔 이미지 순서 변경

### `POST /api/hotel-images/reorder`

이미지 순서를 변경합니다. **fromPath/toPath** 방식 또는 **hotelSlug, sabreId, fromSeq, toSeq** 방식 지원.

---

#### 요청

**Body (JSON)** — 두 가지 패턴

**패턴 A (경로 기반)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| fromPath | string | O | 이동할 파일 경로 (예: originals/slug/filename) |
| toPath | string | O | 대상 경로 |

**패턴 B (seq 기반)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| hotelSlug | string | O | 호텔 slug |
| sabreId | string | O | Sabre ID |
| fromSeq | number | O | 이동할 seq |
| toSeq | number | O | 목표 seq |

**검증**

- 본문이 객체가 아님 → 400.
- fromPath/toPath 또는 hotelSlug+sabreId+fromSeq+toSeq 조합 필수.

---

#### 응답

**200 OK** — success: true  
**400 Bad Request** — fromPath/toPath는 문자열, 또는 seq 필드 누락  
**500 Internal Server Error** — move/copy 실패

---

## 5. 호텔 이미지 일괄 순서 변경

### `POST /api/hotel-images/reorder/bulk`

여러 이미지의 순서를 일괄 변경합니다.

---

#### 요청

**Body (JSON)** — 순서 정보 배열 등. 구현에 따라 상이.

---

#### 응답

**200 OK** — success: true  
**400 Bad Request** — 잘못된 본문  
**500 Internal Server Error**

---

## 6. Storage → DB 동기화

### `POST /api/hotel-images/sync-to-db`  
### `POST /api/hotel-images/sync-folders`  
### `POST /api/hotel-images/sync-storage-to-db`  
### `GET /api/hotel-images/sync-storage-to-db`

Storage 폴더 목록과 DB(select_hotel_media)를 동기화합니다.  
GET은 동기화 결과 조회 등. 구현에 따라 Body/Query 상이.

---

#### 요청/응답

- 각 라우트 파일 참조. 성공 시 success: true, data 또는 메시지 반환.

---

## 7. 이미지 파일명 변경

### `POST /api/hotel-images/rename`

Storage 및 DB에서 파일명(경로)을 변경합니다.

---

#### 요청

**Body (JSON)** — sabreId, oldPath, newPath 등. 구현에 따라 상이.

---

#### 응답

**200 OK** — success: true  
**400/404/500** — 검증/대상 없음/서버 오류

---

## 8. 이미지 가져오기 (상세에서)

### `POST /api/hotel-images/import-from-details`

호텔 상세 등에서 이미지를 가져와 등록합니다.

---

#### 요청/응답

- 구현에 따라 Body 및 응답 형식 상이. 해당 라우트 파일 참조.

---

## 9. 이미지 버전

### `GET /api/hotel-images/version`  
### `POST /api/hotel-images/version`

이미지 버전 정보 조회 또는 버전 생성/관리.

---

#### 요청/응답

- Query/Body는 구현 참조.

---

## 10. 이미지 마이그레이션

### `POST /api/hotel-images/migrate`  
### `GET /api/hotel-images/migrate`  
### `POST /api/hotel-images/migrate-paths`  
### `GET /api/hotel-images/migrate-paths`

경로/스키마 마이그레이션. POST로 실행, GET으로 상태/결과 조회 가능.

---

#### 요청/응답

- 각 라우트 파일 참조.

---

## 11. URL로 이미지 업로드

### `POST /api/hotel-images/upload-from-urls`

URL 목록으로 이미지를 다운로드 후 업로드합니다.

---

#### 요청

**Body (JSON)** — urls: string[] 등. 구현 참조.

---

#### 응답

**200 OK** — success: true, data  
**400/500** — 검증/서버 오류

---

## 12. 콘텐츠 추출/마이그레이션

### `POST /api/hotel-images/content/extract`  
### `POST /api/hotel-images/content/migrate`

콘텐츠에서 이미지 추출 또는 마이그레이션.

---

#### 요청/응답

- 구현 참조.

---

## 13. Bulk 목록/통계/마이그레이션

### `GET /api/hotel-images/bulk/list`  
### `GET /api/hotel-images/bulk/stats`  
### `POST /api/hotel-images/bulk/migrate`  
### `POST /api/hotel-images/bulk/migrate-selected`

벌크 목록 조회, 통계, 전체/선택 마이그레이션.

---

#### 요청/응답

- GET: Query 없거나 필터 파라미터.  
- POST: Body에 대상 목록 등.  
- 성공 시 success: true, data 또는 meta 반환.

---

이 문서는 `src/app/api/hotel-images/**/route.ts` 구현을 기준으로 작성되었습니다.
