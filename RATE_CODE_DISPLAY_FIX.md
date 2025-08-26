# Rate Plan Codes 필드 rate_code 컬럼 출력 수정 가이드

## 🚨 **문제 상황**
Rate Plan Codes 필드가 `rate_plan_codes` 컬럼의 값을 출력하고 있어, 실제 `rate_code` 컬럼의 값이 표시되지 않음

## 🔍 **문제 원인 분석**

### 1. **컬럼 불일치**
- UI에서 `rate_plan_codes` 필드 사용
- 실제 데이터는 `rate_code` 컬럼에 저장됨
- 두 컬럼 간의 데이터 동기화 부족

### 2. **데이터 변환 로직 부족**
- `rate_code` 값을 `rate_plan_codes`로 변환하는 로직 없음
- 하위 호환성을 위한 데이터 매핑 부족

### 3. **UI 표시 문제**
- 필드 라벨이 `rate_code` 컬럼을 사용한다는 것을 명확히 하지 않음
- 디버깅 정보 부족

## ✅ **해결 방법**

### 1. **Repository 함수 수정**
```typescript
// rate_code 값을 rate_plan_codes로 변환 (하위 호환성 유지)
let ratePlanCodes = null
if (hotel.rate_code) {
  // rate_code가 문자열인 경우 콤마로 분리하여 배열로 변환
  if (typeof hotel.rate_code === 'string') {
    ratePlanCodes = hotel.rate_code.split(',').map(code => code.trim()).filter(Boolean)
  }
  // rate_code가 이미 배열인 경우 그대로 사용
  else if (Array.isArray(hotel.rate_code)) {
    ratePlanCodes = hotel.rate_code
  }
  
  // 디버깅: rate_code 변환 결과
  if (String(hotel.sabre_id) === '313016') {
    console.log('=== rate_code 변환 디버깅 ===')
    console.log('원본 rate_code:', hotel.rate_code)
    console.log('변환된 rate_plan_codes:', ratePlanCodes)
    console.log('================================')
  }
}

// 결과 조합
const combinedData = {
  ...hotel,
  hotel_chains: chainData,
  hotel_brands: brandData,
  // rate_code가 있으면 변환된 값을 사용, 없으면 기존 rate_plan_codes 사용
  rate_plan_codes: ratePlanCodes || hotel.rate_plan_codes
}
```

### 2. **데이터 변환 로직**
- **문자열 처리**: `rate_code`가 콤마로 구분된 문자열인 경우 배열로 변환
- **배열 처리**: `rate_code`가 이미 배열인 경우 그대로 사용
- **하위 호환성**: 기존 `rate_plan_codes` 값이 있으면 유지

### 3. **UI 개선**
```typescript
{/* Rate Plan Codes */}
<div className="space-y-1 md:col-span-2 lg:col-span-1">
  <label className="block text-sm font-medium text-gray-700">
    Rate Plan Codes (rate_code 컬럼)
  </label>
  <div className="w-full px-3 py-2 text-sm bg-gray-50 rounded-md border border-gray-200">
    {Array.isArray(initialData.rate_plan_codes) 
      ? (initialData.rate_plan_codes as string[]).join(', ') || '-'
      : '-'
    }
  </div>
  {/* 디버깅 정보 */}
  {String(initialData.sabre_id ?? '') === '313016' && (
    <div className="text-xs text-gray-400 mt-1">
      rate_plan_codes: {Array.isArray(initialData.rate_plan_codes) ? initialData.rate_plan_codes.join(', ') : '없음'}
    </div>
  )}
</div>
```

## 🛠️ **수정된 파일들**

### **Repository 함수**
- `src/features/hotels/lib/repository.ts` - `rate_code` 값을 `rate_plan_codes`로 변환하는 로직 추가

### **호텔 편집 폼**
- `src/app/admin/hotel-update/[sabre]/hotel-edit-form.tsx` - 필드 라벨 및 디버깅 정보 개선

## 🔧 **테스트 방법**

### 1. **데이터 변환 확인**
1. 브라우저 개발자 도구 콘솔 열기
2. Sabre ID 313016인 호텔 페이지 접근
3. Repository 로그에서 rate_code 변환 결과 확인

### 2. **UI 표시 확인**
1. 호텔 편집 화면에서 Rate Plan Codes 필드 확인
2. `rate_code` 컬럼의 값이 올바르게 표시되는지 확인
3. 디버깅 정보에서 변환된 데이터 확인

### 3. **로그 확인**
- `=== Repository 호텔 데이터 디버깅 ===`
- `rate_code 값: ...`
- `rate_plan_codes 값: ...`
- `=== rate_code 변환 디버깅 ===`
- `원본 rate_code: ...`
- `변환된 rate_plan_codes: ...`

## 📋 **로그 확인 포인트**

### **Repository 로그**
- `=== Repository 호텔 데이터 디버깅 ===`
- `rate_code 값: ...`
- `rate_plan_codes 값: ...`
- `=== rate_code 변환 디버깅 ===`
- `원본 rate_code: ...`
- `변환된 rate_plan_codes: ...`
- `최종 rate_plan_codes: ...`

### **호텔 편집 폼 로그**
- `=== Sabre ID 313016 호텔 정보 ===`
- `rate_plan_codes: ...`

## 🎯 **예상 결과**

### **수정 전**
- Rate Plan Codes 필드에 `rate_plan_codes` 컬럼 값만 표시
- `rate_code` 컬럼의 값이 UI에 반영되지 않음

### **수정 후**
- Rate Plan Codes 필드에 `rate_code` 컬럼의 값이 표시됨
- 콤마로 구분된 문자열이 배열로 변환되어 표시
- 하위 호환성 유지로 기존 기능에 영향 없음

## 🔍 **문제 해결 체크리스트**

- [ ] Repository에서 rate_code 변환 로그 확인
- [ ] UI에 rate_code 값이 표시되는지 확인
- [ ] 디버깅 정보에서 변환된 데이터 확인
- [ ] 하위 호환성 유지 확인
- [ ] 타입 안전성 확인

## 📞 **추가 지원**

문제가 지속되면 다음을 확인하세요:
1. Supabase 테이블의 `rate_code` 컬럼 구조
2. Repository 함수의 데이터 변환 로그
3. 호텔 편집 폼의 디버깅 정보
4. 브라우저 개발자 도구의 네트워크 탭

이제 Rate Plan Codes 필드가 `rate_code` 컬럼의 값을 올바르게 출력할 것입니다.
