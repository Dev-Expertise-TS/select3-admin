# select_hotels 테이블 chain_id 컬럼 제거 및 brand_id 사용 수정 가이드

## 🚨 **문제 상황**
```
서버 오류 (500): {"success":false,"error":"호텔 정보 저장 중 오류가 발생했습니다: column select_hotels.chain_id does not exist"}
```

## 🔍 **문제 원인 분석**

### 1. **테이블 구조 불일치**
- `select_hotels` 테이블에 `chain_id` 컬럼이 존재하지 않음
- 코드에서 존재하지 않는 `chain_id` 컬럼에 업데이트 시도
- Supabase에서 컬럼 존재하지 않음 오류 발생

### 2. **information_schema 접근 오류**
- `information_schema.columns` 테이블 접근 시도 실패
- `relation "public.information_schema.columns" does not exist` 오류
- 테이블 구조 확인 로직 실패

### 3. **데이터 관계 혼동**
- `chain_id`와 `brand_id`의 관계가 명확하지 않음
- `select_hotels` 테이블에는 `brand_id`만 존재
- 체인 정보는 `hotel_brands` 테이블을 통해 간접적으로 접근

## ✅ **해결 방법**

### 1. **Repository 함수 수정**
```typescript
// select_hotels 테이블에 chain_id 컬럼이 없으므로 제거
if ('chain_id' in updateData) {
  console.log('[updateHotelRow] chain_id 컬럼이 테이블에 없어 제거됨')
  delete updateData.chain_id
}

// select 쿼리에서 chain_id 제거
const { data, error } = await query.select('sabre_id, paragon_id, property_name_ko, property_name_en, rate_code, brand_id').single()
```

### 2. **API 엔드포인트 수정**
```typescript
// 브랜드 정보만 사용 (chain_id는 select_hotels 테이블에 없음)
const brand_id_raw = formData.get('brand_id') as string | null
const brand_id = (brand_id_raw && brand_id_raw.trim() !== '') ? Number(brand_id_raw) || null : null

// 호텔 업데이트 데이터에서 chain_id 제거
const hotelUpdateData: Record<string, unknown> = { 
  property_name_ko, 
  property_name_en, 
  rate_code, 
  sabre_id: sabreIdEditable
}

// brand_id만 추가
if (brand_id !== null) {
  hotelUpdateData.brand_id = brand_id
}
```

### 3. **호텔 편집 폼 수정**
```typescript
// 체인 정보는 브랜드를 통해 간접적으로만 사용
const [selectedChain, setSelectedChain] = React.useState<Chain | null>(() => {
  if (initialData.hotel_brands) {
    const brands = initialData.hotel_brands as Record<string, unknown> | null
    if (brands && brands.chain_id) {
      return {
        chain_id: Number(brands.chain_id ?? 0),
        name_kr: '', // 체인 이름은 별도로 표시하지 않음
        name_en: ''
      }
    }
  }
  return null
})
```

## 🛠️ **수정된 파일들**

### **Repository 함수**
- `src/features/hotels/lib/repository.ts` - `chain_id` 컬럼 제거 및 `information_schema` 접근 제거

### **API 엔드포인트**
- `src/app/api/hotel/update/route.ts` - `chain_id` 관련 로직 제거, `brand_id`만 사용

### **호텔 편집 폼**
- `src/app/admin/hotel-update/[sabre]/hotel-edit-form.tsx` - 체인 정보를 브랜드를 통해 간접적으로만 사용

## 🔧 **테스트 방법**

### 1. **데이터 저장 확인**
1. 호텔 편집 화면에서 브랜드 선택
2. 저장 버튼 클릭
3. `chain_id` 컬럼 오류 없이 저장 성공 확인

### 2. **데이터 표시 확인**
1. 저장 후 페이지 새로고침
2. 브랜드 정보가 올바르게 표시되는지 확인
3. 체인 정보는 브랜드를 통해 간접적으로 표시되는지 확인

### 3. **로그 확인**
- `=== 호텔 업데이트 API 브랜드 정보 ===`
- `brand_id_raw: ...`
- `최종 brand_id: ...`
- `=== 최종 업데이트 데이터 ===`
- `[updateHotelRow] chain_id 컬럼이 테이블에 없어 제거됨`

## 📋 **로그 확인 포인트**

### **API 로그**
- `=== 호텔 업데이트 API 브랜드 정보 ===`
- `brand_id_raw: ...`
- `최종 brand_id: ...`
- `=== 최종 업데이트 데이터 ===`

### **Repository 로그**
- `=== updateHotelRow 디버깅 ===`
- `[updateHotelRow] chain_id 컬럼이 테이블에 없어 제거됨`
- `최종 업데이트 데이터: ...`
- `업데이트 성공: ...`

## 🎯 **예상 결과**

### **수정 전**
- `column select_hotels.chain_id does not exist` 오류 발생
- `information_schema.columns` 접근 오류
- 호텔 정보 저장 불가

### **수정 후**
- `chain_id` 컬럼 관련 오류 없음
- `brand_id`만 사용하여 데이터 저장 성공
- 체인 정보는 브랜드를 통해 간접적으로 접근

## 🔍 **문제 해결 체크리스트**

- [ ] Repository에서 `chain_id` 컬럼 제거 확인
- [ ] API에서 `chain_id` 관련 로직 제거 확인
- [ ] 호텔 편집 폼에서 체인 정보 간접 접근 확인
- [ ] 데이터 저장 시 오류 없음 확인
- [ ] `brand_id`를 통한 브랜드 정보 저장 확인

## 📞 **추가 지원**

문제가 지속되면 다음을 확인하세요:
1. Supabase 테이블의 `select_hotels` 구조
2. `hotel_brands`와 `hotel_chains` 테이블 관계
3. API 로그에서 데이터 처리 과정
4. Repository 로그에서 업데이트 성공 여부

## 🔄 **데이터 관계 요약**

```
select_hotels (brand_id) → hotel_brands (chain_id) → hotel_chains
```

- **`select_hotels`**: `brand_id` 컬럼만 보유
- **`hotel_brands`**: `brand_id`, `chain_id` 컬럼 보유
- **`hotel_chains`**: `chain_id` 컬럼 보유

체인 정보는 브랜드를 통해 간접적으로만 접근하며, `select_hotels` 테이블에는 직접 저장하지 않습니다.

이제 `chain_id` 컬럼 오류 없이 호텔 정보가 저장되고 표시될 것입니다.
