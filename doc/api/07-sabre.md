# Sabre / 요금 API 상세 명세

## 1. Sabre 토큰 확인

### `GET /api/sabre/token`

Sabre API 토큰을 조회합니다. 토큰 본문은 마스킹되어 반환됩니다.

---

#### 요청

- Query, Body 없음.

---

#### 응답

**200 OK**

```json
{
  "ok": true,
  "token_preview": "xxxxxxxx...xxxxxxxx"
}
```

**500 Internal Server Error**

```json
{
  "ok": false,
  "error": "error message"
}
```

---

## 2. Sabre 호텔 상세 조회

### `GET /api/sabre/hotel-details`

Sabre ID로 외부 Sabre 프록시 API를 호출해 호텔 상세 정보를 조회합니다.  
실패 시 데모 데이터를 반환할 수 있습니다.

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
    "HotelDetailsInfo": {
      "HotelInfo": {
        "HotelCode": "313016",
        "HotelName": "...",
        "CodeContext": "GLOBAL",
        "ChainCode": "...",
        "BrandCode": "...",
        "SabreRating": "..."
      }
    }
  }
}
```

**200 OK (API 실패, 데모 데이터 반환 시)**

- 동일 구조에 `error` 필드에 메시지 포함.

**400 Bad Request** — Sabre ID 필요  
**500 Internal Server Error**

---

## 3. Sabre 호텔 요금 조회

### `GET /api/sabre/hotel-rates`  
### `POST /api/sabre/hotel-rates`

호텔 요금 정보를 Sabre API로 조회합니다. 재시도 로직 포함.

---

#### 요청

**GET — Query**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| hotelId | string | O | 호텔 ID |
| checkInDate | string | O | YYYY-MM-DD |
| checkOutDate | string | O | YYYY-MM-DD |

**POST — Body (JSON)**

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| hotelId | string | O | - | 호텔 ID |
| checkInDate | string | O | - | YYYY-MM-DD |
| checkOutDate | string | O | - | YYYY-MM-DD |
| adults | number | X | 2 | 성인 수 |
| children | number | X | 0 | 아동 수 |
| currency | string | X | USD | 통화 |
| ratePlanCodes | string[] | X | - | 요금 플랜 코드 |

**검증**

- hotelId, checkInDate, checkOutDate 필수 → 400.
- 날짜 형식 YYYY-MM-DD 아님 → 400.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "hotelId": "...",
    "checkInDate": "...",
    "checkOutDate": "...",
    "rooms": [...]
  }
}
```

**400 Bad Request** — hotelId, checkInDate, checkOutDate는 필수 / 날짜 형식 오류  
**408 Request Timeout** — SUPPLIER_TIMEOUT  
**503 Service Unavailable** — VENDOR_ERROR  
**500 Internal Server Error**

---

## 4. Sabre DB 검색

### `GET /api/sabre/db-search`

DB 기반 Sabre 호텔 검색. Query 파라미터로 검색어 등 전달.

---

#### 요청

**Query** — 구현에 따라 검색어, 필터 등.

---

#### 응답

**200 OK** — success: true, data: 검색 결과 배열  
**400/500** — 구현 참조.

---

## 5. Sabre ID 실시간 검색

### `POST /api/sabre-id/search`

Sabre API 기반 실시간 호텔 검색.  
숫자만 입력 시 해당 호텔 코드로 상세 조회, 문자열 입력 시 확장 호텔 코드 범위로 실시간 검색 후 부분 매칭합니다.

---

#### 요청

**Body (JSON)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| hotelName | string | O | 호텔명 또는 호텔 코드(숫자) |

**검증**

- hotelName 없거나 문자열이 아님 → 400.
- hotelName trim 후 길이 < 2 → 400.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": [
    {
      "hotelCode": "313016",
      "hotelName": "Hotel Name",
      "address": "...",
      "city": "...",
      "country": "..."
    }
  ]
}
```

**200 OK (결과 없음)**

```json
{
  "success": true,
  "data": [],
  "error": "검색 결과가 없습니다. 검색어: \"...\""
}
```

**400 Bad Request** — hotelName 필요 및 최소 2글자  
**500 Internal Server Error**

---

## 6. Sabre ID OpenAI 검색

### `POST /api/sabre-id/openai-search`

OpenAI를 활용한 호텔 검색. Body에 검색어 등 전달.

---

#### 요청/응답

- 구현 참조. 성공 시 success: true, data 반환.

---

## 7. 호텔 요금 조회 (공개 API)

### `GET /api/select-hotel-price`

**공개용** 호텔 요금 조회 API.  
CORS: `*.priviatravel.com`만 허용.  
필수 Query: sabre_id, check_in(YYYY-MM-DD), nights, number_of_people.  
DB에서 rate_plan_code 조회 후 ExactMatchOnly 결정, 외부 Sabre 프록시 호출 후 Room×RatePlan 변환하여 반환합니다.

---

#### 요청

**Query**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sabre_id | string | O | 호텔 Sabre ID |
| check_in | string | O | YYYY-MM-DD |
| nights | string | O | 숫자 문자열, 1~30 |
| number_of_people | string | O | 숫자 문자열, 1~20 |

**검증**

- 필수 파라미터 누락 → 400.
- check_in 형식 오류 → 400.
- check_in이 과거 날짜 → 400.
- nights 1~30 아님 → 400.
- number_of_people 1~20 아님 → 400.
- 호텔 없음 → 404.
- rate_plan_code 없음 → 422.
- 객실 없음 → 404.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "propertyNameKor": "...",
    "propertyNameEng": "...",
    "sabreId": "313016",
    "destinationKor": "",
    "destinationEng": "",
    "cityKor": "",
    "cityEng": "",
    "paragonId": 0,
    "roomDescriptions": [
      {
        "price": 200000,
        "roomCode": "...",
        "roomName": "API - Room desc",
        "roomDescription": "...",
        "cancelDeadLine": "20240314"
      }
    ]
  },
  "search_info": {
    "sabre_id": "313016",
    "check_in": "2024-03-15",
    "check_out": "2024-03-17",
    "guests": 2,
    "nights": 2
  }
}
```

**400 Bad Request** — 필수 파라미터 누락, 날짜/숙박일/인원 검증 실패  
**404 Not Found** — 호텔 없음, 요금 정보(객실) 없음  
**422 Unprocessable Entity** — rate_plan_code 미설정  
**503 Service Unavailable** — DB 조회 실패  
**504 Gateway Timeout** — Sabre 프록시 타임아웃  
**500 Internal Server Error**

**헤더**: Cache-Control: no-store, Access-Control-Allow-Origin (허용 origin만)

---

#### 비고

- ExactMatchOnly: API, ZP3, VMC, TLC, H01, S72만 있으면 true.  
- 취소 마감일(cancelDeadLine)은 Sabre 응답 CancelPenalties에서 계산하여 YYYYMMDD 문자열로 반환.

---

이 문서는 `src/app/api/sabre/**/route.ts`, `src/app/api/sabre-id/**/route.ts`, `src/app/api/select-hotel-price/route.ts` 구현을 기준으로 작성되었습니다.
