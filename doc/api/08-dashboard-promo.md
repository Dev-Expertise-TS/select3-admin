# 대시보드 / 프로모션 / 기타 API 상세 명세

## 1. 대시보드 통계

### `GET /api/dashboard/stats`

대시보드용 집계 데이터를 반환합니다.  
체인/브랜드/호텔 수, Sabre ID 누락, 체인·브랜드 미연결, 혜택 미매핑, 소개/블로그 아티클 누락 수 등.

---

#### 요청

- Query, Body 없음.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "totalHotels": 1000,
    "chainCount": 50,
    "brandCount": 200,
    "missingSabreId": 5,
    "missingChainBrand": 10,
    "missingBenefits": 30,
    "missingIntroArticle": 100,
    "missingBlogArticle": 200
  }
}
```

**500 Internal Server Error** — 통계 데이터를 가져오는 중 오류

**캐시**: revalidate 300 (5분)

---

## 2. 프로모션 배너 목록

### `GET /api/promo-banners/list`

프로모션 배너 목록을 조회합니다. **현재 구현은 빈 배열을 반환**합니다.

---

#### 요청

- Query, Body 없음.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "banners": [],
    "totalCount": 0
  }
}
```

**500 Internal Server Error**

---

## 3. 프로모션 배너 생성

### `POST /api/promo-banners/create`

프로모션 배너를 생성합니다. **현재는 DB 저장 없이 mock 응답**을 반환합니다.

---

#### 요청

**Body (JSON)**

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| title | string | O | - | 제목 |
| content | string | O | - | 내용 |
| link_url | string | X | null | 링크 URL |
| background_color | string | X | #3B82F6 | 배경색 |
| text_color | string | X | #FFFFFF | 글자색 |
| is_active | boolean | X | true | 활성 여부 |
| priority | number | X | 1 | 우선순위 |
| start_date | string | X | null | 시작일 |
| end_date | string | X | null | 종료일 |

**검증**

- title 또는 content 없음 → 400.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "banner": {
      "id": 1234567890,
      "title": "...",
      "content": "...",
      "link_url": null,
      "background_color": "#3B82F6",
      "text_color": "#FFFFFF",
      "is_active": true,
      "priority": 1,
      "start_date": null,
      "end_date": null,
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  },
  "message": "프로모션 베너가 성공적으로 생성되었습니다."
}
```

**400 Bad Request** — 제목과 내용은 필수  
**500 Internal Server Error**

---

## 4. 프로모션 배너 수정

### `PUT /api/promo-banners/update`

프로모션 배너를 수정합니다. Body에 id 및 수정 필드 전달.

---

#### 요청/응답

- 구현 참조. 성공 시 success: true, data 반환.

---

## 5. 프로모션 배너 삭제

### `DELETE /api/promo-banners/delete`

프로모션 배너를 삭제합니다. Body 또는 Query로 id 전달.

---

#### 요청/응답

- 구현 참조.

---

## 6. 프로모션 슬롯

### `GET /api/promotion-slots`  
### `POST /api/promotion-slots`

프로모션 슬롯 목록 조회 및 생성.

---

#### 요청

**GET** — Query: 필터 등.  
**POST** — Body: 슬롯 데이터.

---

#### 응답

**200 OK** — success: true, data  
**400/500** — 구현 참조.

---

## 7. 프로모션 슬롯 단건

### `GET /api/promotion-slots/[id]`  
### `PUT /api/promotion-slots/[id]`  
### `DELETE /api/promotion-slots/[id]`

단건 조회, 수정, 삭제.

---

#### 요청/응답

- Path: id. GET/PUT/DELETE 각각 구현 참조.

---

## 8. 피처 슬롯

### `GET /api/feature-slots`  
### `GET /api/feature-slots/banner`

피처 슬롯 목록 및 배너 조회.

---

#### 요청/응답

- Query 없거나 필터. 성공 시 success: true, data.

---

## 9. Rate Plan 코드 목록

### `GET /api/rate-plan-codes`

허용 Rate Plan 코드 목록을 반환합니다. 설정(config/rate-plan-codes) 기반.

---

#### 요청

- Query, Body 없음.

---

#### 응답

**200 OK** — success: true, data: string[]  
**500 Internal Server Error**

---

## 10. 만족도 설문 목록

### `GET /api/satisfaction-survey/list`

고객 만족도 설문 목록을 조회합니다. sort 오름차순, submitted_at 내림차순.

---

#### 요청

- Query, Body 없음.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sort": 0,
      "submitted_at": "...",
      "...": "..."
    }
  ]
}
```

**500 Internal Server Error** — details 포함 가능

---

## 11. 만족도 설문 정렬 일괄 변경

### `POST /api/satisfaction-survey/bulk-update-sort`

만족도 설문 항목의 sort 값을 일괄 업데이트합니다.

---

#### 요청

**Body (JSON)** — id별 sort 배열 등. 구현 참조.

---

#### 응답

**200 OK** — success: true  
**400/500** — 구현 참조.

---

## 12. 로그인 이미지

### `GET /api/login-images`

로그인 페이지용 이미지 목록 등을 조회합니다.

---

#### 요청/응답

- 구현 참조.

---

## 13. 도시 이미지

### `GET /api/city-images/list`  
### `GET /api/city-images/first`  
### `POST /api/city-images/upload`  
### `POST /api/city-images/batch`  
### `DELETE /api/city-images/delete`

도시 이미지 목록, 첫 이미지, 업로드, 배치, 삭제.

---

#### 요청/응답

- 각 라우트 파일 참조.

---

## 14. 브랜드 이미지

### `GET /api/brand-image/[brandName]`

브랜드명에 해당하는 이미지(public 파일 등)를 반환합니다.

---

#### 요청

**Path**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| brandName | string | O | 브랜드명 (예: accor, marriott) |

---

#### 응답

**200 OK** — 이미지 스트림 또는 리다이렉트  
**404 Not Found** — 해당 브랜드 이미지 없음

---

## 15. 공항 목록

### `GET /api/airports`

공항 목록을 조회합니다. Query로 필터 가능.

---

#### 요청

**Query** — 구현에 따라 검색어, 지역 등.

---

#### 응답

**200 OK** — success: true, data: 공항 배열  
**500 Internal Server Error**

---

## 16. 호텔 SEO 소개

### `GET /api/hotel-seo-intro/fetch`

호텔 SEO 소개 문구 등을 조회합니다. Query: sabre_id 등.

---

#### 요청/응답

- 구현 참조.

---

## 17. 시설 제안

### `GET /api/facility-proposal/stats`  
### `GET /api/facility-proposal/analytics`  
### `GET /api/facility-proposal/brand-traffic`

시설 제안 통계, 분석, 브랜드 트래픽.

---

#### 요청/응답

- Query 없거나 필터. 성공 시 success: true, data.

---

## 18. OpenAI 상태

### `GET /api/openai/health`

OpenAI 연동 상태를 확인합니다.

---

#### 요청

- Query, Body 없음.

---

#### 응답

**200 OK** — 연동 정상  
**500 Internal Server Error** — 연동 실패

---

## 19. 사용자 이메일 확인

### `POST /api/users/confirm-email`  
### `POST /api/users/confirm-all-emails`

이메일 확인 처리. Body에 토큰 등 전달.

---

#### 요청/응답

- 구현 참조.

---

## 20. 사용자 활동 로그

### `GET /api/users/[id]/activity`

지정 사용자 id의 활동 로그를 조회합니다.

---

#### 요청

**Path**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | string | O | 사용자 ID |

---

#### 응답

**200 OK** — success: true, data: 활동 배열  
**400/404/500** — 구현 참조.

---

이 문서는 `src/app/api/dashboard/**`, `src/app/api/promo-banners/**`, `src/app/api/promotion-slots/**`, `src/app/api/feature-slots/**`, `src/app/api/rate-plan-codes/**`, `src/app/api/satisfaction-survey/**`, `src/app/api/login-images/**`, `src/app/api/city-images/**`, `src/app/api/brand-image/**`, `src/app/api/airports/**`, `src/app/api/hotel-seo-intro/**`, `src/app/api/facility-proposal/**`, `src/app/api/openai/**`, `src/app/api/users/**` 구현을 기준으로 작성되었습니다.
