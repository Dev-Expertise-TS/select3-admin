# Rate Plan Code Enum 오류 해결 및 rate_code 컬럼 사용 가이드

## 🚨 **문제 상황**
```
서버 오류 (500): {"success":false,"error":"호텔 정보 저장 중 오류가 발생했습니다: invalid input value for enum rate_plan_code: \"[\"TLC\"]\""}
```

## 🔍 **문제 원인 분석**

### 1. **Enum 타입 불일치**
- `rate_plan_code` enum 타입에 배열 형태의 문자열 `"["TLC"]"` 전달
- `rate_plan_codes` 필드가 배열을 JSON 문자열로 변환하여 전송
- Supabase에서 enum 타입 검증 실패

### 2. **컬럼 사용 혼동**
- UI에서 `rate_plan_codes` 필드 사용
- 실제로는 `rate_code` 컬럼을 사용해야 함
- `rate_plan_code` enum 타입 불필요

### 3. **데이터 변환 문제**
- `rate_code` 값을 배열로 변환 후 다시 문자열로 전송
- 불필요한 데이터 변환 과정

## ✅ **해결 방법**

### 1. **API 엔드포인트 수정**
```typescript
// rate_plan_codes 대신 rate_code 사용
const ratePlanCodesRaw = (formData.get('rate_plan_codes') as string | null) ?? ''
const ratePlanCodesParsed = ratePlanCodesRaw ? ratePlanCodesRaw.split(',').map((s) => s.trim()).filter(Boolean) : []
const rate_code = ratePlanCodesParsed.length > 0 ? ratePlanCodesParsed.join(', ') : null

// 호텔 업데이트 데이터에 rate_code 포함
const hotelUpdateData: Record<string, unknown> = { 
  property_name_ko, 
  property_name_en, 
  rate_code,  // rate_plan_codes 대신 rate_code 사용
  sabre_id: sabreIdEditable
}
```

### 2. **Repository 함수 수정**
```typescript
// rate_code 컬럼을 사용하여 업데이트
const { data, error } = await query.select('sabre_id, paragon_id, property_name_ko, property_name_en, rate_code, brand_id, chain_id').single()

// enum 타입 검증 제거 - rate_code는 문자열 컬럼
```

### 3. **데이터 흐름 단순화**
- **입력**: Rate Plan Codes 필드에서 콤마로 구분된 값 입력
- **처리**: 콤마로 분리하여 배열로 변환 후 다시 콤마로 결합
- **저장**: `rate_code` 컬럼에 문자열로 저장
- **표시**: 저장된 `rate_code` 값을 콤마로 분리하여 UI에 표시

## 🛠️ **수정된 파일들**

### **API 엔드포인트**
- `src/app/api/hotel/update/route.ts` - `rate_plan_codes` → `rate_code` 변경

### **Repository 함수**
- `src/features/hotels/lib/repository.ts` - `rate_code` 컬럼 사용 및 enum 검증 제거

## 🔧 **테스트 방법**

### 1. **데이터 저장 확인**
1. 호텔 편집 화면에서 Rate Plan Codes 입력
2. 저장 버튼 클릭
3. 서버 오류 없이 저장 성공 확인

### 2. **데이터 표시 확인**
1. 저장 후 페이지 새로고침
2. Rate Plan Codes 필드에 입력한 값이 표시되는지 확인
3. `rate_code` 컬럼에 올바른 값이 저장되었는지 확인

### 3. **로그 확인**
- `=== 호텔 업데이트 API 체인/브랜드 정보 ===`
- `ratePlanCodesRaw: ...`
- `ratePlanCodesParsed: [...]`
- `최종 rate_code: ...`
- `=== 최종 업데이트 데이터 ===`

## 📋 **로그 확인 포인트**

### **API 로그**
- `=== 호텔 업데이트 API 체인/브랜드 정보 ===`
- `ratePlanCodesRaw: ...`
- `ratePlanCodesParsed: [...]`
- `최종 rate_code: ...`
- `=== 최종 업데이트 데이터 ===`

### **Repository 로그**
- `=== updateHotelRow 디버깅 ===`
- `chain_id 컬럼 존재 여부: ...`
- `업데이트 성공: ...`

## 🎯 **예상 결과**

### **수정 전**
- `rate_plan_code` enum 타입 오류 발생
- 배열 형태의 문자열이 enum에 전달되어 검증 실패
- 호텔 정보 저장 불가

### **수정 후**
- `rate_code` 컬럼에 문자열로 저장
- enum 타입 검증 없이 데이터 저장 성공
- Rate Plan Codes 값이 올바르게 저장 및 표시

## 🔍 **문제 해결 체크리스트**

- [ ] API에서 `rate_code` 컬럼 사용 확인
- [ ] Repository에서 enum 타입 검증 제거 확인
- [ ] 데이터 저장 시 오류 없음 확인
- [ ] 저장된 데이터가 UI에 올바르게 표시 확인
- [ ] `rate_code` 컬럼에 올바른 값 저장 확인

## 📞 **추가 지원**

문제가 지속되면 다음을 확인하세요:
1. Supabase 테이블의 `rate_code` 컬럼 구조
2. API 로그에서 데이터 변환 과정
3. Repository 로그에서 업데이트 성공 여부
4. 브라우저 개발자 도구의 네트워크 탭

## 🔄 **데이터 흐름 요약**

```
UI 입력 → FormData → API 처리 → rate_code 변환 → Repository 업데이트 → DB 저장
   ↓
DB 조회 → rate_code 값 → UI 표시
```

이제 Rate Plan Codes 필드가 `rate_code` 컬럼을 사용하여 오류 없이 저장되고 표시될 것입니다.
