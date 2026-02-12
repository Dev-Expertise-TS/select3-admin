# Sabre API v3.0 vs v5.1 비교표

본 문서는 현재 코드베이스에서 사용하는 **Sabre Hotel API v3.0.0**과 **Sabre Hotel API v5.1**의 모든 요소를 테이블로 비교합니다.  
구현 기준: `services/SabreApiService.js`, `lib/SabreService.js`, `routes/public/hotel.js`.

---

## 1. 개요 및 용도

| 비교 항목 | v3.0.0 | v5.1 |
|-----------|--------|------|
| **목적** | 호텔 요금·객실 정보 조회 | 호텔 요금·객실 정보 + **미디어(이미지/비디오/360)** 조회 |
| **스펙 기준** | Sabre v3.0.0 Get Hotel Details | Sabre OpenAPI v5 / v5.1 Get Hotel Details |
| **미디어 요청** | 없음 | HotelContentRef.MediaRef로 이미지/HD360/비디오 요청 |
| **객실–이미지 매핑** | 없음 | RoomMediaInfo / HotelMediaInfo 기반 매핑 후 roomDescriptions에 포함 |
| **config 키** | `API_VERSION: 'v3.0.0'` | `API_VERSION: 'v5.1'` |

---

## 2. API 엔드포인트 URL

| 비교 항목 | v3.0.0 | v5.1 |
|-----------|--------|------|
| **Production 기본 URL** | `https://api.platform.sabre.com/v3.0.0/get/hoteldetails` | `https://api.platform.sabre.com/v5/get/hoteldetails` |
| **Cert URL** | (동일 경로 사용 시 cert 도메인 별도 없음) | `https://api.cert.platform.sabre.com/v5/get/hoteldetails` |
| **URL 개수** | 1개 고정 | 복수 후보(cert / production / v5.1.0, v5.1 폴백) |
| **환경 변수** | (공통 API URL 사용) | `SABRE_V51_API_URL` |
| **실패 시 재시도** | 해당 URL 실패 시 즉시 에러 | 401/404 시 **다른 후보 URL로 자동 재시도** |
| **토큰 환경 반영** | 없음 | cert/production 토큰에 따라 시도 순서 변경 |

---

## 3. 서버 라우트(엔드포인트)

| 기능 | v3.0.0 | v5.1 |
|------|--------|------|
| **요금 조회 (select-rooms-price)** | `GET /public/hotel/sabre/:sabre_id/select-rooms-price` | `GET /public/hotel/sabre/v5.1/:sabre_id/select-rooms-price` |
| **호텔 상세 (hotel-details)** | `POST /public/hotel/sabre/hotel-details` (기본, 또는 헤더/바디에서 v5.1 유도 시 v5.1 호출) | `POST /public/hotel/sabre/v5.1/hotel-details` (v5.1 전용) |
| **비교 테스트** | `GET /public/hotel/sabre/test-compare/:sabre_id` 에서 v3와 v5.1 **동시 호출** | 동일 라우트에서 v51 결과로 포함 |

---

## 4. 요청 바디 구조 (GetHotelDetailsRQ)

| 요소 | v3.0.0 | v5.1 |
|------|--------|------|
| **POS.Source.PseudoCityCode** | 있음 | 있음 |
| **SearchCriteria.HotelRefs.HotelRef** | HotelCode, CodeContext | 동일 |
| **SearchCriteria.RateInfoRef** | CurrencyCode, PrepaidQualifier, ConvertedRateInfoOnly, StayDateTimeRange, Rooms.Room(Adults) | 동일 |
| **SearchCriteria.RateInfoRef.RatePlanCandidates** | 있음 (ExactMatchOnly·RatePlanCandidate) | 있음 (동일 + 코드 정책 적용) |
| **HotelContentRef** | **없음** | **있음** |
| **HotelContentRef.MediaRef** | 없음 | MaxItems, MediaTypes(Images LARGE, HD360, Videos), AdditionalInfo(CAPTION, ROOM_TYPE_CODE), Languages(EN), Categories(1~22) |
| **HotelContentRef.DescriptiveInfoRef** | 없음 | PropertyInfo, LocationInfo, Amenities, Descriptions(ShortDescription, Dining, Facilities, Recreation, Services) |
| **요청 바디 생성 메서드** | `_buildRequestBody(params)` 또는 `_buildRequestBodyLimited(params)` | `_buildRequestBodyV51(params)` |

---

## 5. 요청 파라미터 (Body / Query)

| 파라미터 | v3.0.0 | v5.1 | 비고 |
|----------|--------|------|------|
| HotelCode | 필수 | 필수 | 동일 |
| CurrencyCode | 필수 | 필수 | 동일 |
| StartDate / EndDate | 필수 (YYYY-MM-DD) | 필수 | 동일 |
| Adults | 필수 (1~10) | 필수 | 동일 |
| Children | 선택 (기본 0) | 선택 | 동일 |
| Rooms | 선택 (기본 1) | 선택 | 동일 |
| RatePlanCode | 선택 (문자열 또는 배열) | 선택 | 동일 |
| ExactMatchOnly | 선택 (boolean). _buildRequestBody 사용 시 **클라이언트 값 그대로** 전달; _buildRequestBodyLimited 사용 시 코드 목록에 따라 자동 결정 | 선택(boolean). **클라이언트 값은 사용하지 않음**, 요청한 RatePlanCode가 전부 exactMatchOnly 목록에 있을 때만 true, 그 외 false | v5.1은 다른 코드도 요청 가능하나 ExactMatchOnly는 서버에서만 결정 |
| includeOriginalResponse | (파라곤 변환 시 선택) | (파라곤 변환 시 선택) | 동일 |

---

## 6. 요금 플랜 코드(RatePlanCode) 정책

| 항목 | v3.0.0 | v5.1 |
|------|--------|------|
| **클라이언트 ExactMatchOnly 값** | _buildRequestBody: **클라이언트 지정 그대로** 전달(다른 코드도 true/false 자유). _buildRequestBodyLimited: 코드 목록에 따라 서버에서 결정, 클라이언트 값 무시 | **클라이언트 지정 값 무시**. 요청한 코드 목록만 보고 서버에서 ExactMatchOnly 결정 |
| **ExactMatchOnly=true 가 되는 경우** | _buildRequestBody: 클라이언트가 true 보내면 그대로 true. _buildRequestBodyLimited: 요청 코드가 **전부** API, ZP3, VMC, TLC, H01, S72, L72 일 때만 true | 요청 코드가 **전부** API, ZP3, VMC, TLC, H01, S72, L72 일 때만 true (Limited와 동일) |
| **다른 코드(위 7개 제외) 사용** | _buildRequestBody: 가능, 클라이언트가 보낸 ExactMatchOnly 그대로 사용. _buildRequestBodyLimited: 가능, 그때는 ExactMatchOnly=false 로 전송 | **가능**. 모든 코드 요청 가능, 그때는 자동으로 **ExactMatchOnly=false** 로 전송됨 |
| **조회 불가(차단) 코드** | 없음 (클라이언트 요청 rate plan code 모두 조회 가능) | 없음 (동일) |
| **정의 위치** | `services/rateCodes.js` (exactMatchOnlyRateCodeList만 사용) | `services/rateCodes.js` (동일) |

**정리**: 금지 코드 차단은 제거되어, **클라이언트가 요청하는 모든 rate plan code**로 조회 가능하다. ExactMatchOnly는 요청한 코드가 전부 `exactMatchOnlyRateCodeList`에 들어갈 때만 true, 그 외에는 false로 설정된다.

### 6.1 금지 코드 설정 배경(참고, 현재는 차단 제거됨)

과거에 **XLO, PPR, FAN, WMP, HPM, TID, STP** 를 “조회 불가”로 둔 이유는 다음과 같다.

- **Sabre 360 단말 조회와 동일한 조건**으로 맞추기 위해, `PrepaidQualifier: ExcludePrepaid`, `ExactMatchOnly: true` 로 조회 가능한 코드(API, ZP3, VMC, TLC, H01, S72, L72)만 허용하려는 정책이 있었음.
- 위 6개 코드(XLO, PPR 등)는 해당 호텔에서 E66L PCC 로 요금에 태그를 붙여 보내지 않아, `ExactMatchOnly: true` 로는 조회되지 않고, `false` 일 때만 일반 요금과 섞여 조회되는 경우가 있음.
- “세이버 단말에서 조회되는 요금과 일치하는 호텔(코드)만 캘린더 요금 조회에 쓰자”는 사업 규칙 때문에 **조회 불가 목록**으로 막아 두었음.

**현재**: 위 차단 로직을 제거하여, **클라이언트가 요청하는 모든 rate plan code**로 조회 가능하다. `services/SabreApiService.js`(_buildRequestBodyLimited, _buildRequestBodyV51), `services/getRatePlanParams.js` 에서 금지 코드 검사는 제거되었고, `rateCodes.js` 의 `forbiddenRateCodeList` 는 참고용으로만 남겨 두었다.

---

## 7. 응답 구조 (호텔 상세)

| 항목 | v3.0.0 | v5.1 |
|------|--------|------|
| **Sabre 원본 응답 포함** | getHotelDetails: 원본 그대로. getHotelDetailsConvertParagon: includeOriginalResponse 시만 originalResponse 로 포함 | 원본 **GetHotelDetailsRS** 를 최상위에 유지 + 추가 필드 |
| **변환 후 최상위 필드** | propertyNameKor, propertyNameEng, sabreId, destinationKor/Eng, cityKor/Eng, paragonId, **roomDescriptions** | GetHotelDetailsRS, **roomDescriptions**, **hotelMediaInfo**, **rateKeyRoomMap**, **RoomImageData**, **apiVersion** |
| **roomDescriptions** | 요금·객실 정보만 (이미지 없음) | 요금·객실 정보 + **images**, **mainImage**, **thumbnailImages**, **imagesByArea**, **bedroomImages**, **imageMappingInfo** |
| **hotelMediaInfo** | 없음 | images, videos, logos, hd360Images, **imagesByRoomType** |
| **rateKeyRoomMap** | 없음 | RateKey → roomCode, roomName, bedroomImages, bedroomMainImage 등 |
| **RoomImageData** | 없음 | roomImageMap, hotelMediaInfo, apiVersion |
| **apiVersion** | 없음 | `"v5.1"` |
| **변환 메서드** | `_convertSabreResponse(sabreResponse, requestParams)` | `_convertSabreResponseV51(sabreResponse, requestParams)` (+ _addImageDataToOriginalResponse) |

---

## 8. roomDescriptions 항목별 필드 비교

| 필드 | v3.0.0 | v5.1 |
|------|--------|------|
| rateKey | 있음 | 있음 |
| rateSource | 있음 | 있음 |
| ratePlanName | 있음 | 있음 |
| productCode | 있음 | 있음 |
| roomTypeCode | (추출 시 있음) | 있음 |
| roomId | (추출 시 있음) | 있음 |
| price | 있음 | 있음 |
| roomCode | 있음 | 있음 |
| roomName | 있음 | 있음 |
| roomDescription | 있음 | 있음 |
| cancelDeadLine | 있음 | 있음 |
| cancelPenalties | 있음 | 있음 |
| **images** | **없음** | **있음** (객실별 이미지 배열) |
| **mainImage** | 없음 | 있음 (대표 이미지 1장) |
| **thumbnailImages** | 없음 | 있음 |
| **imagesByArea** | 없음 | 있음 (bedroom, bathroom, living, kitchen, other) |
| **bedroomImages** | 없음 | 있음 |
| **imageMappingInfo** | 없음 | 있음 (source, matchedKeys, roomIdentifiers) |

---

## 9. 미디어(이미지/비디오) 지원

| 항목 | v3.0.0 | v5.1 |
|------|--------|------|
| **요청 시 미디어 요청** | 없음 | MediaRef: Images(LARGE), PanoramicMedia(HD360), Videos(VIDEO360, VIDEO720 등), AdditionalInfo(CAPTION, ROOM_TYPE_CODE), Categories(1~22) |
| **응답 원본에 RoomMediaInfo** | (스펙상 없음) | 있으면 객실별 미디어로 사용 |
| **응답 원본에 HotelMediaInfo** | (스펙상 없음) | 있으면 imagesByRoomType 등으로 활용, RoomMediaInfo 없을 때 폴백 |
| **객실–이미지 매핑 로직** | 없음 | RoomMediaInfo 우선 → HotelMediaInfo 매칭(RoomID, RoomTypeCode, ProductCode, 부분 일치, _GENERAL_ROOM 폴백) |
| **객실 내부 이미지 필터** | 없음 | Category/Caption 기반 휴리스틱 (외부/시설/“Room View” 등 제외) |
| **베드룸 우선 정렬** | 없음 | 있음 (mainImage 안정화) |
| **미디어 디버그** | 없음 | SABRE_MEDIA_DEBUG, DEBUG_MEDIA, DEBUG_MEDIA_LEVEL |

---

## 10. 서비스 레이어 메서드 (SabreApiService)

| 용도 | v3.0.0 | v5.1 |
|------|--------|------|
| **원본 조회(변환 없음)** | `getHotelDetails(params, token)` — _buildRequestBody 또는 _buildRequestBodyV51(API_VERSION에 따라) | v5.1 config로 호출 시 getHotelDetails 내부에서 _buildRequestBodyV51 사용 |
| **파라곤 형식 변환 조회** | `getHotelDetailsConvertParagon(params, token, includeOriginalResponse)` — _buildRequestBody**Limited**, _convertSabreResponse, **단일 URL** | `getHotelDetailsV51ConvertParagon(params, token, includeOriginalResponse, tokenEnvironment)` — _buildRequestBody**V51**, _addImageDataToOriginalResponse + _convertSabreResponse**V51**, **복수 URL 재시도** |
| **요청 바디 생성** | _buildRequestBody (free), _buildRequestBodyLimited (Paragon/캘린더 일치용) | _buildRequestBodyV51 (미디어 포함) |
| **응답 변환** | _convertSabreResponse | _convertSabreResponseV51, _addImageDataToOriginalResponse |
| **객실 추출** | _extractRoomDescriptions(hotelRateInfo) — hotelMediaInfo 없음 | _extractRoomDescriptions(hotelRateInfo, **hotelMediaInfo**) — 이미지 매핑 포함 |
| **미디어 추출/매핑** | 없음 | _extractHotelMediaInfo, _extractRoomMediaInfo, _mapRoomImages, _sortRoomImagesBedroomFirst, _groupRoomImagesByArea, _isLikelyRoomInteriorImage 등 |

---

## 11. 오류 처리

| 항목 | v3.0.0 | v5.1 |
|------|--------|------|
| **공통 _handleError** | sabre_api_error, network_error, general_error 반환 | 동일 |
| **타임아웃** | 15초 | 15초 |
| **401 인증 오류** | 즉시 에러 반환 | **다음 후보 URL로 재시도** |
| **404 / Invalid path** | 즉시 에러 반환 | **다음 후보 URL로 재시도** |
| **그 외 4xx/5xx** | 즉시 에러 반환 | 즉시 에러 반환 (재시도 없음) |
| **전체 후보 실패 시** | (해당 없음) | "v5.1 호텔 상세 API 호출 실패: 사용 가능한 엔드포인트를 찾지 못했습니다." |

---

## 12. 설정 및 환경 변수

| 항목 | v3.0.0 | v5.1 |
|------|--------|------|
| **config.API_URL** | `https://api.platform.sabre.com/v3.0.0/get/hoteldetails` | `process.env.SABRE_V51_API_URL \|\| 'https://api.platform.sabre.com/v5/get/hoteldetails'` |
| **config.API_VERSION** | `'v3.0.0'` | `'v5.1'` |
| **PSEUDO_CITY_CODE / CODE_CONTEXT / PREPAID_QUALIFIER / DEFAULT_ROOM_INDEX** | 동일 (LD38, SABRE, ExcludePrepaid, 1) | 동일 |
| **미디어 디버그** | 없음 | SABRE_MEDIA_DEBUG(1/2), DEBUG_MEDIA, DEBUG_MEDIA_LEVEL |
| **구성 위치** | `lib/SabreService.js` (SABRE_CONFIG_V3, SABRE_CONFIG) | `lib/SabreService.js` (SABRE_CONFIG_V51), `routes/public/hotel.js` (v5.1 라우트용) |

---

## 13. select-rooms-price 응답 래핑 비교

| 항목 | v3.0.0 | v5.1 |
|------|--------|------|
| **success** | true | true |
| **data** | propertyNameKor/Eng, sabreId, roomDescriptions(요금·객실, cancelPenalties 포함) | propertyNameKor/Eng, sabreId, roomDescriptions(요약 필드만 노출 가능) |
| **search_info** | sabre_id, check_in, check_out, guests, nights | 동일 |
| **apiVersion** | 없음 | `"v5.1"` |
| **객실 항목 상세도** | rateKey, rateSource, ratePlanName, productCode, price, roomCode, roomName, roomDescription, cancelDeadLine, cancelPenalties | rateKey, price, roomCode, roomName 등 (이미지 필드는 hotel-details에서만 사용) |

---

## 14. 클라이언트 요청 형식 (API 호출 시)

### 14.1 요청 헤더

| 헤더 | v3.0.0 | v5.1 | 비고 |
|------|--------|------|------|
| **Content-Type** | `application/json` | `application/json` | 동일 |
| **Authorization** | `Bearer {토큰}` | `Bearer {토큰}` | 동일 |
| **X-Correlation-ID** | 선택사항 (요청 추적용) | 선택사항 | 동일 |
| **x-api-version** | 없음 | `v5.1` (선택사항, 헤더로 버전 지정 가능) | v5.1 전용 |

### 14.2 요청 Body 형식 (POST /hotel-details)

| 필드 | v3.0.0 | v5.1 | 필수 여부 | 설명 |
|------|--------|------|-----------|------|
| **HotelCode** | 있음 | 있음 | 필수 | Sabre 호텔 ID (문자열) |
| **CurrencyCode** | 있음 | 있음 | 필수 | 통화 코드 (예: "KRW") |
| **StartDate** | 있음 | 있음 | 필수 | 체크인 날짜 (YYYY-MM-DD 형식) |
| **EndDate** | 있음 | 있음 | 필수 | 체크아웃 날짜 (YYYY-MM-DD 형식) |
| **Adults** | 있음 | 있음 | 필수 | 성인 수 (1~10) |
| **Children** | 있음 | 있음 | 선택 | 아동 수 (기본값 0) |
| **Rooms** | 있음 | 있음 | 선택 | 객실 수 (기본값 1) |
| **RatePlanCode** | 있음 | 있음 | 선택 | 요금 플랜 코드 (문자열 또는 문자열 배열) |
| **ExactMatchOnly** | 있음 (클라이언트 값 그대로 전달 또는 서버 결정) | 있음 (클라이언트 값 무시, 서버에서 자동 결정) | 선택 | boolean. v3는 메서드에 따라 다름, v5.1은 항상 서버 결정 |
| **includeOriginalResponse** | 있음 | 있음 | 선택 | 원본 응답 포함 여부 (파라곤 변환 시) |

**v3.0.0 요청 예시:**
```json
{
  "HotelCode": "12345",
  "CurrencyCode": "KRW",
  "StartDate": "2026-02-01",
  "EndDate": "2026-02-03",
  "Adults": 2,
  "Children": 0,
  "Rooms": 1,
  "RatePlanCode": ["API", "ZP3"],
  "ExactMatchOnly": true
}
```

**v5.1 요청 예시:**
```json
{
  "HotelCode": "12345",
  "CurrencyCode": "KRW",
  "StartDate": "2026-02-01",
  "EndDate": "2026-02-03",
  "Adults": 2,
  "Children": 0,
  "Rooms": 1,
  "RatePlanCode": ["API"],
  "ExactMatchOnly": true
}
```
*참고: v5.1에서 ExactMatchOnly는 클라이언트 값이 무시되고 서버에서 자동 결정됨*

### 14.3 Query 파라미터 (GET /select-rooms-price)

| 파라미터 | v3.0.0 | v5.1 | 필수 여부 | 설명 |
|----------|--------|------|-----------|------|
| **sabre_id** | 있음 (path) | 있음 (path) | 필수 | Sabre 호텔 ID |
| **check_in** | 있음 | 있음 | 필수 | 체크인 날짜 (YYYY-MM-DD) |
| **nights** | 있음 | 있음 | 필수 | 숙박 일수 (1~30) |
| **number_of_people** | 있음 | 있음 | 필수 | 인원 수 (1~20) |

**요청 예시:**
```
GET /public/hotel/sabre/12345/select-rooms-price?check_in=2026-02-01&nights=2&number_of_people=2
GET /public/hotel/sabre/v5.1/12345/select-rooms-price?check_in=2026-02-01&nights=2&number_of_people=2
```

### 14.4 Sabre API로 전송되는 실제 요청 바디 구조

| 구조 요소 | v3.0.0 | v5.1 | 설명 |
|-----------|--------|------|------|
| **GetHotelDetailsRQ** | 있음 | 있음 | 루트 요소 |
| **POS.Source.PseudoCityCode** | 있음 | 있음 | "LD38" |
| **SearchCriteria.HotelRefs.HotelRef** | 있음 | 있음 | HotelCode, CodeContext("SABRE") |
| **SearchCriteria.RateInfoRef** | 있음 | 있음 | CurrencyCode, PrepaidQualifier, StayDateTimeRange, Rooms |
| **SearchCriteria.RateInfoRef.RatePlanCandidates** | 있음 | 있음 | ExactMatchOnly, RatePlanCandidate |
| **SearchCriteria.HotelContentRef** | **없음** | **있음** | v5.1 전용 미디어 요청 |
| **HotelContentRef.MediaRef** | 없음 | 있음 | MaxItems="ALL", MediaTypes, AdditionalInfo, Languages, Categories |
| **HotelContentRef.MediaRef.MediaTypes.Images** | 없음 | 있음 | Image: [{ Type: "LARGE" }] |
| **HotelContentRef.MediaRef.MediaTypes.PanoramicMedias** | 없음 | 있음 | PanoramicMedia: [{ Type: "HD360" }] |
| **HotelContentRef.MediaRef.MediaTypes.Videos** | 없음 | 있음 | Video: [{ Type: "VIDEO360" }, { Type: "VIDEO720" }, ...] |
| **HotelContentRef.MediaRef.AdditionalInfo** | 없음 | 있음 | Info: [{ Type: "CAPTION" }, { Type: "ROOM_TYPE_CODE" }] |
| **HotelContentRef.MediaRef.Categories** | 없음 | 있음 | Category: [{ Code: 1 }, ..., { Code: 22 }] |
| **HotelContentRef.DescriptiveInfoRef** | 없음 | 있음 | PropertyInfo, LocationInfo, Amenities, Descriptions |

---

## 15. 클라이언트 응답 형식 (API 응답)

### 15.1 성공 응답 구조 비교

| 최상위 필드 | v3.0.0 | v5.1 | 설명 |
|-------------|--------|------|------|
| **GetHotelDetailsRS** | 없음 (변환된 형식만) | 있음 (Sabre 원본 응답 유지) | v5.1은 원본 구조 유지 |
| **propertyNameKor** | 있음 | 있음 | 호텔명 (한글) |
| **propertyNameEng** | 있음 | 있음 | 호텔명 (영문) |
| **sabreId** | 있음 | 있음 | Sabre 호텔 ID |
| **destinationKor/Eng** | 있음 | 있음 | 목적지 정보 |
| **cityKor/Eng** | 있음 | 있음 | 도시 정보 |
| **paragonId** | 있음 | 있음 | Paragon ID (기본값 0) |
| **roomDescriptions** | 있음 | 있음 | 객실 목록 배열 |
| **hotelMediaInfo** | 없음 | 있음 | 호텔 전체 미디어 정보 |
| **rateKeyRoomMap** | 없음 | 있음 | RateKey별 객실 매핑 |
| **RoomImageData** | 없음 | 있음 | 객실 이미지 데이터 |
| **apiVersion** | 없음 | 있음 | "v5.1" |

### 15.2 roomDescriptions 항목 상세 비교

| 필드 | v3.0.0 | v5.1 | 타입 | 설명 |
|------|--------|------|------|------|
| **rateKey** | 있음 | 있음 | string | 요금 키 (고유 식별자) |
| **rateSource** | 있음 | 있음 | string | 요금 소스 (예: "SABRE") |
| **ratePlanName** | 있음 | 있음 | string | 요금 플랜명 |
| **productCode** | 있음 | 있음 | string | 제품 코드 |
| **roomTypeCode** | (추출 시 있음) | 있음 | string | 객실 타입 코드 |
| **roomId** | (추출 시 있음) | 있음 | string | 객실 ID |
| **price** | 있음 | 있음 | number | 가격 (KRW) |
| **roomCode** | 있음 | 있음 | string | 객실 코드 |
| **roomName** | 있음 | 있음 | string | 객실명 |
| **roomDescription** | 있음 | 있음 | string | 객실 설명 |
| **cancelDeadLine** | 있음 | 있음 | string | 취소 마감일 (YYYYMMDD) |
| **cancelPenalties** | 있음 | 있음 | array | 취소 정책 배열 |
| **images** | 없음 | 있음 | array | 객실별 이미지 배열 |
| **mainImage** | 없음 | 있음 | object | 대표 이미지 (images[0]) |
| **thumbnailImages** | 없음 | 있음 | array | 썸네일 이미지 배열 |
| **imagesByArea** | 없음 | 있음 | object | 영역별 이미지 (bedroom, bathroom, living, kitchen, other) |
| **bedroomImages** | 없음 | 있음 | array | 베드룸 이미지 배열 |
| **imageMappingInfo** | 없음 | 있음 | object | 이미지 매핑 정보 (source, matchedKeys, roomIdentifiers) |

### 15.3 v3.0.0 응답 예시

```json
{
  "propertyNameKor": "PARK HYATT",
  "propertyNameEng": "PARK HYATT",
  "sabreId": "12345",
  "destinationKor": "",
  "destinationEng": "",
  "cityKor": "",
  "cityEng": "",
  "paragonId": 0,
  "roomDescriptions": [
    {
      "rateKey": "RKEY-001",
      "rateSource": "SABRE",
      "ratePlanName": "BAR",
      "productCode": "API",
      "price": 286000,
      "roomCode": "DLX",
      "roomName": "API - Deluxe King",
      "roomDescription": "Deluxe King Room",
      "cancelDeadLine": "20260201",
      "cancelPenalties": [
        {
          "refundable": true,
          "deadline": "2026-01-30",
          "deadlineString": "20260130",
          "deadlineOffset": null
        }
      ]
    }
  ]
}
```

### 15.4 v5.1 응답 예시

```json
{
  "GetHotelDetailsRS": {
    "ApplicationResults": {
      "status": "Complete"
    },
    "HotelDetailsInfo": {
      // Sabre 원본 응답 구조
    }
  },
  "propertyNameKor": "PARK HYATT",
  "propertyNameEng": "PARK HYATT",
  "sabreId": "12345",
  "roomDescriptions": [
    {
      "rateKey": "RKEY-001",
      "rateSource": "SABRE",
      "ratePlanName": "BAR",
      "productCode": "API",
      "roomTypeCode": "DLX",
      "roomId": "G2T",
      "price": 286000,
      "roomCode": "DLX",
      "roomName": "API - Deluxe King",
      "roomDescription": "Deluxe King Room",
      "cancelDeadLine": "20260201",
      "cancelPenalties": [...],
      "images": [
        {
          "mediaItemId": "12345",
          "url": "https://image.example.com/room1.jpg",
          "type": "LARGE",
          "categoryCode": 6,
          "categoryName": "Guest Room",
          "caption": "Deluxe King Room",
          "width": 1920,
          "height": 1080,
          "roomTypeCodes": ["G2T", "DLX"]
        }
      ],
      "mainImage": { /* images[0]와 동일 */ },
      "bedroomImages": [ /* 베드룸 이미지만 */ ],
      "imagesByArea": {
        "bedroom": [...],
        "bathroom": [...],
        "living": [...],
        "kitchen": [...],
        "other": [...]
      },
      "imageMappingInfo": {
        "source": "RoomMediaInfo",
        "matchedKeys": ["G2T", "DLX"],
        "roomIdentifiers": ["G2T", "123", "API"]
      }
    }
  ],
  "hotelMediaInfo": {
    "images": [...],
    "videos": [...],
    "logos": [...],
    "hd360Images": [...],
    "imagesByRoomType": {
      "G2T": [...],
      "DLX": [...]
    }
  },
  "rateKeyRoomMap": {
    "RKEY-001": {
      "roomCode": "DLX",
      "roomName": "API - Deluxe King",
      "bedroomImages": [...],
      "bedroomMainImage": {...}
    }
  },
  "RoomImageData": {
    "roomImageMap": {...},
    "hotelMediaInfo": {...},
    "apiVersion": "v5.1"
  },
  "apiVersion": "v5.1"
}
```

### 15.5 hotelMediaInfo 구조 (v5.1 전용)

| 필드 | 타입 | 설명 |
|------|------|------|
| **images** | array | 호텔 전체 이미지 배열 |
| **videos** | array | 비디오 목록 |
| **logos** | array | 로고 이미지 |
| **hd360Images** | array | 360도 이미지 |
| **imagesByRoomType** | object | RoomTypeCode별 이미지 매핑 (키: RoomTypeCode, 값: 이미지 배열) |

### 15.6 이미지 객체 구조 (v5.1)

| 필드 | 타입 | 설명 |
|------|------|------|
| **mediaItemId** | string | 미디어 항목 ID |
| **mediaItemOrdinal** | number | 정렬 순서 |
| **url** | string | 이미지 URL |
| **type** | string | 이미지 타입 (예: "LARGE") |
| **categoryCode** | number | 카테고리 코드 (1~22) |
| **categoryName** | string | 카테고리명 (예: "Guest Room") |
| **caption** | string | 캡션/설명 |
| **description** | string | 설명 (caption과 동일) |
| **width** | number | 이미지 너비 |
| **height** | number | 이미지 높이 |
| **languageCode** | string | 언어 코드 (예: "EN") |
| **roomTypeCodes** | array | 연결된 객실 타입 코드 배열 |

### 15.7 cancelPenalties 구조

| 필드 | 타입 | 설명 |
|------|------|------|
| **refundable** | boolean | 환불 가능 여부 |
| **deadline** | string | 마감일 (YYYY-MM-DD 형식) |
| **deadlineString** | string | 마감일 (YYYYMMDD 형식) |
| **deadlineOffset** | object/null | Offset 정보 (OffsetTimeUnit, OffsetUnitMultiplier, OffsetDropTime) |

---

## 16. 에러 응답 형식

### 16.1 공통 에러 응답 구조

| 필드 | 타입 | 설명 |
|------|------|------|
| **success** | boolean | false |
| **error** | object | 에러 정보 객체 |
| **error.message** | string | 에러 메시지 |
| **error.code** | string | 에러 코드 |
| **error.correlationId** | string | 요청 추적 ID |

**에러 응답 예시:**
```json
{
  "success": false,
  "error": {
    "message": "에러 메시지",
    "code": "INTERNAL_SERVER_ERROR",
    "correlationId": "uuid"
  }
}
```

### 16.2 HTTP 상태 코드

| 상태 코드 | v3.0.0 | v5.1 | 설명 |
|-----------|--------|------|------|
| **200** | 있음 | 있음 | 성공 |
| **400** | 있음 | 있음 | 잘못된 요청 (파라미터 누락/형식 오류) |
| **401** | 있음 | 있음 | 인증 오류 (v5.1은 다른 URL로 재시도) |
| **404** | 있음 | 있음 | 리소스 없음 (v5.1은 다른 URL로 재시도) |
| **422** | 있음 | 있음 | 처리 불가 (rate_plan_code 미설정 등) |
| **503** | 있음 | 있음 | 서비스 오류 (Sabre API 오류, 네트워크 오류) |

### 16.3 Sabre API 에러 응답 (v5.1)

v5.1에서 Sabre API 원본 에러가 포함될 수 있음:

```json
{
  "type": "sabre_api_error",
  "message": "Sabre API 오류",
  "status": 400,
  "sabreErrorCode": "ERROR_CODE",
  "sabreErrorType": "ERROR_TYPE",
  "data": {
    "GetHotelDetailsRS": {
      "ApplicationResults": {
        "Error": {
          "ErrorCode": "...",
          "ErrorMessage": "..."
        }
      }
    }
  }
}
```

---

## 17. 요약 매트릭스

| 구분 | v3.0.0 | v5.1 |
|------|--------|------|
| **미디어(이미지/비디오/360)** | 미지원 | 지원 (요청·매핑·정렬 포함) |
| **요청 바디** | SearchCriteria 까지 | SearchCriteria + **HotelContentRef** |
| **응답 확장** | roomDescriptions(요금·객실만) | roomDescriptions+이미지, hotelMediaInfo, rateKeyRoomMap, RoomImageData, apiVersion |
| **엔드포인트** | 단일 URL | 복수 URL + 토큰 환경별 재시도 |
| **요금 코드 정책** | Limited 사용 시만 필터/차단 | 항상 exactMatchOnly 목록·불허 목록 적용 |
| **원본 응답 유지** | Paragon 변환 시 선택적 originalResponse | 최상위 GetHotelDetailsRS 유지 + 추가 필드 |

---

*문서 버전: 2.0. 기준 코드: services/SabreApiService.js, lib/SabreService.js, routes/public/hotel.js, API_SPEC.md 섹션 6.*
