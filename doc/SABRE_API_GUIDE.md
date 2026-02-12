# Sabre API 호텔 이미지 연동 가이드

## 개요
이 프로젝트는 Sabre API의 OAuth 2.0 Client Credentials 방식을 사용하여 호텔 이미지를 가져오는 기능을 구현합니다.

## 설정 방법

### 1. Sabre Developer 계정 생성
1. [Sabre Developer Portal](https://developer.sabre.com)에서 계정을 생성하세요.
2. 새 애플리케이션을 생성하고 Client ID와 Client Secret을 받으세요.

### 2. 환경 변수 설정
`.env.local` 파일에 다음 정보를 추가하세요:

```env
SABRE_CLIENT_ID=your_actual_client_id_here
SABRE_CLIENT_SECRET=your_actual_client_secret_here
```

**예시 형식:**
```env
SABRE_CLIENT_ID=V1:abcd1234:DETN:EXT:AA
SABRE_CLIENT_SECRET=AbCdEf12345
```

### 3. API 엔드포인트 활성화
- Sabre 계정 담당자에게 연락하여 Hotel Image API 서비스를 활성화해 달라고 요청하세요.
- 일부 지역(Americas, EMEA)에서만 사용 가능합니다.

## 구현된 기능

### 1. OAuth 2.0 토큰 서비스 (`src/services/sabre-auth.ts`)
- Client Credentials 방식으로 액세스 토큰 자동 발급
- 토큰 캐싱 및 자동 갱신
- 에러 처리 및 재시도 로직

### 2. 호텔 이미지 API (`src/app/api/hotel/images/route.ts`)
- Sabre REST API를 통한 실제 호텔 이미지 조회
- 여러 응답 형식에 대한 유연한 파싱
- 인증 정보 없을 시 데모 이미지 제공
- 상세한 에러 처리

### 3. 호텔 이미지 관리 UI (`src/app/admin/hotel-images`)
- 호텔 검색 및 이미지 표시
- 이미지 모달 뷰어 with 키보드 네비게이션
- 반응형 그리드 레이아웃

## API 사용법

### 호텔 이미지 조회
```
GET /api/hotel/images?sabreCode=HOTEL_CODE
```

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "url": "https://example.com/image1.jpg",
      "caption": "호텔 외관",
      "category": "Exterior",
      "width": 800,
      "height": 600
    }
  ]
}
```

## 주의사항

1. **캐싱 제한**: Sabre 약관에 따라 이미지 캐싱이 금지되어 있습니다.
2. **이미지 품질**: Sabre API에서 제공하는 이미지는 품질이 제한적일 수 있습니다.
3. **지역 제한**: 일부 지역에서만 서비스가 제공됩니다.
4. **API 호출 제한**: Sabre API 호출 한도를 준수해야 합니다.

## 테스트 방법

1. 환경 변수가 설정되지 않은 경우: 데모 이미지가 표시됩니다.
2. 실제 인증 정보 설정 후: 호텔 이미지 관리 페이지에서 호텔을 검색하여 실제 이미지를 확인할 수 있습니다.

## 트러블슈팅

### 일반적인 오류
- `401 Unauthorized`: Client ID/Secret 확인 필요
- `403 Forbidden`: API 서비스 활성화 필요
- `404 Not Found`: 호텔 코드 확인 필요
- `429 Too Many Requests`: API 호출 한도 초과

### 로그 확인
개발자 도구의 네트워크 탭에서 API 호출 상태를 확인할 수 있습니다.

## 지원

문제가 발생하면 다음을 확인하세요:
1. Sabre Developer Portal 계정 상태
2. API 키 유효성
3. 네트워크 연결
4. 서버 로그