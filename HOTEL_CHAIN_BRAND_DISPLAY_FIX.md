# 호텔 상세 편집 화면 체인/브랜드 정보 표시 문제 해결 가이드

## 🚨 **문제 상황**
호텔 상세 편집 화면의 기본정보 영역에서 체인/브랜드 필드의 값이 제대로 불러와지지 않음

## 🔍 **문제 원인 분석**

### 1. **테이블 컬럼명 불일치**
- 코드에서 `name_kr`, `name_en` 컬럼을 참조
- 실제 테이블에는 `brand_name_kr`, `brand_name_en`, `chain_name_kr`, `chain_name_en` 컬럼이 존재할 수 있음

### 2. **데이터 조회 로직 부족**
- `select_hotels` 테이블의 `sabre_id`로 `hotel_brands` 테이블 조회 부족
- `hotel_brands`의 `chain_id`로 `hotel_chains` 테이블 조회 부족

### 3. **초기 데이터 설정 누락**
- 호텔 편집 폼에서 초기 체인/브랜드 정보 설정 부족
- UI 상태와 데이터베이스 데이터 동기화 부족

## ✅ **해결 방법**

### 1. **동적 컬럼 매핑 구현**
```typescript
// hotel_brands 테이블 구조 확인을 위해 샘플 데이터 조회
const { data: brandSample, error: brandSampleError } = await supabase
  .from('hotel_brands')
  .select('*')
  .limit(1)

if (brandSample && brandSample.length > 0) {
  const brandColumns = Object.keys(brandSample[0])
  console.log('hotel_brands 테이블 컬럼:', brandColumns)
  
  // 실제 컬럼명 찾기
  const brandIdColumn = brandColumns.find(col => 
    col.toLowerCase().includes('brand') && col.toLowerCase().includes('id')
  ) || 'brand_id'
  
  const brandNameKrColumn = brandColumns.find(col => 
    col.toLowerCase().includes('name') && (col.toLowerCase().includes('kr') || col.toLowerCase().includes('ko'))
  ) || 'name_kr'
  
  const brandNameEnColumn = brandColumns.find(col => 
    col.toLowerCase().includes('name') && col.toLowerCase().includes('en')
  ) || 'name_en'
  
  const chainIdColumn = brandColumns.find(col => 
    col.toLowerCase().includes('chain') && col.toLowerCase().includes('id')
  ) || 'chain_id'
}
```

### 2. **체인/브랜드 정보 조회 로직**
```typescript
// hotel_brands 테이블에서 브랜드 정보 조회
const brandRes = await supabase
  .from('hotel_brands')
  .select(`${brandIdColumn}, ${brandNameKrColumn}, ${brandNameEnColumn}, ${chainIdColumn}`)
  .eq(brandIdColumn, hotel.brand_id)
  .single()

if (brandRes.data) {
  // 조회된 데이터를 표준 형식으로 변환
  brandData = {
    brand_id: brandRes.data[brandIdColumn],
    name_kr: brandRes.data[brandNameKrColumn],
    name_en: brandRes.data[brandNameEnColumn],
    chain_id: brandRes.data[chainIdColumn]
  }
  
  // 브랜드의 chain_id로 체인 정보 조회
  if (brandData.chain_id) {
    const chainRes = await supabase
      .from('hotel_chains')
      .select(`${chainIdColumnChain}, ${chainNameKrColumn}, ${chainNameEnColumn}`)
      .eq(chainIdColumnChain, brandData.chain_id)
      .single()
    
    if (chainRes.data) {
      chainData = {
        chain_id: chainRes.data[chainIdColumnChain],
        name_kr: chainRes.data[chainNameKrColumn],
        name_en: chainRes.data[chainNameEnColumn]
      }
    }
  }
}
```

### 3. **초기 데이터 설정**
```typescript
// 체인/브랜드 선택 상태 초기화
const [selectedChain, setSelectedChain] = React.useState<Chain | null>(() => {
  const chains = initialData.hotel_chains as Record<string, unknown> | null
  
  return chains ? {
    chain_id: Number(chains.chain_id ?? 0),
    name_kr: String(chains.name_kr ?? ''),
    name_en: String(chains.name_en ?? '')
  } : null
})

const [selectedBrand, setSelectedBrand] = React.useState<Brand | null>(() => {
  const brands = initialData.hotel_brands as Record<string, unknown> | null
  
  return brands ? {
    brand_id: Number(brands.brand_id ?? 0),
    chain_id: Number(brands.chain_id ?? 0) || null,
    name_kr: String(brands.name_kr ?? ''),
    name_en: String(brands.name_en ?? '')
  } : null
})
```

## 🛠️ **수정된 파일들**

### **Repository 함수**
- `src/features/hotels/lib/repository.ts` - 동적 컬럼 매핑 및 체인/브랜드 정보 조회 로직 개선

### **호텔 편집 폼**
- `src/app/admin/hotel-update/[sabre]/hotel-edit-form.tsx` - 초기 데이터에서 체인/브랜드 정보 설정

## 🔧 **테스트 방법**

### 1. **데이터 조회 확인**
1. 브라우저 개발자 도구 콘솔 열기
2. Sabre ID 313016인 호텔 페이지 접근
3. Repository 로그 확인

### 2. **체인/브랜드 정보 표시 확인**
1. 호텔 편집 화면에서 체인/브랜드 필드 확인
2. 초기 데이터가 올바르게 표시되는지 확인
3. 디버깅 로그에서 데이터 구조 확인

### 3. **컬럼 매핑 확인**
- `hotel_brands 테이블 컬럼: [...]` 로그 확인
- `브랜드 컬럼 매핑: {...}` 로그 확인
- `hotel_chains 테이블 컬럼: [...]` 로그 확인
- `체인 컬럼 매핑: {...}` 로그 확인

## 📋 **로그 확인 포인트**

### **Repository 로그**
- `=== Repository 브랜드 조회 디버깅 ===`
- `hotel_brands 테이블 컬럼: [...]`
- `브랜드 컬럼 매핑: {...}`
- `hotel_chains 테이블 컬럼: [...]`
- `체인 컬럼 매핑: {...}`

### **호텔 편집 폼 로그**
- `=== Sabre ID 313016 호텔 정보 ===`
- `hotel_brands 데이터: {...}`
- `hotel_chains 데이터: {...}`
- `selectedChain: {...}`
- `selectedBrand: {...}`

## 🎯 **예상 결과**

### **수정 전**
- 체인/브랜드 필드에 값이 표시되지 않음
- 데이터베이스에서 정보를 제대로 조회하지 못함

### **수정 후**
- 체인/브랜드 필드에 올바른 값이 표시됨
- `select_hotels` → `hotel_brands` → `hotel_chains` 순서로 데이터 조회
- 동적 컬럼 매핑으로 다양한 테이블 구조 지원

## 🔍 **문제 해결 체크리스트**

- [ ] Repository에서 체인/브랜드 정보 조회 로그 확인
- [ ] 테이블 컬럼 매핑 로그 확인
- [ ] 호텔 편집 폼에서 초기 데이터 설정 확인
- [ ] UI에 체인/브랜드 정보가 표시되는지 확인
- [ ] 디버깅 로그에서 데이터 구조 확인

## 📞 **추가 지원**

문제가 지속되면 다음을 확인하세요:
1. Supabase 테이블 구조 및 컬럼명
2. Repository 함수의 데이터 조회 로그
3. 호텔 편집 폼의 초기 데이터 로그
4. 브라우저 개발자 도구의 네트워크 탭

이제 호텔 상세 편집 화면에서 체인/브랜드 정보가 올바르게 표시될 것입니다.
