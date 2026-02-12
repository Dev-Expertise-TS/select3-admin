# 체인 필드 값 표시 문제 해결 가이드

## 🚨 **문제 상황**
체인 필드 값이 표시되지 않고 있음

## 🔍 **문제 원인 분석**

### 1. **데이터 조회 로직 부족**
- `hotel_brands` 테이블의 `brand_id` 값과 일치하는 행의 `chain_id` 값을 조회하지 않음
- `hotel_chains` 테이블의 `chain_name_kr`, `chain_name_en` 값을 조회하지 않음
- 체인 정보가 완전히 구성되지 않음

### 2. **체인 정보 초기화 문제**
- 호텔 편집 폼에서 체인 정보를 브랜드를 통해 간접적으로만 설정
- `hotel_chains` 테이블에서 조회된 실제 데이터를 사용하지 않음
- 체인 이름이 빈 문자열로 표시됨

### 3. **데이터 관계 미연결**
- `select_hotels` → `hotel_brands` → `hotel_chains` 연결이 불완전
- 체인 정보 조회 후 UI 상태에 반영되지 않음

## ✅ **해결 방법**

### 1. **Repository 함수 수정**
```typescript
// 브랜드의 chain_id로 체인 정보 조회
if (brandData.chain_id) {
  // hotel_chains 테이블 구조 확인
  const { data: chainSample, error: chainSampleError } = await supabase
    .from('hotel_chains')
    .select('*')
    .limit(1)
  
  if (!chainSampleError && chainSample && chainSample.length > 0) {
    const chainColumns = Object.keys(chainSample[0])
    
    // 체인 컬럼명 찾기
    const chainIdColumnChain = chainColumns.find(col => 
      col.toLowerCase().includes('chain') && col.toLowerCase().includes('id')
    ) || 'chain_id'
    
    const chainNameKrColumn = chainColumns.find(col => 
      col.toLowerCase().includes('name') && (col.toLowerCase().includes('kr') || col.toLowerCase().includes('ko'))
    ) || 'name_kr'
    
    const chainNameEnColumn = chainColumns.find(col => 
      col.toLowerCase().includes('name') && col.toLowerCase().includes('en')
    ) || 'name_en'
    
    // hotel_chains 테이블에서 체인 정보 조회
    const chainRes = await supabase
      .from('hotel_chains')
      .select(`${chainIdColumnChain}, ${chainNameKrColumn}, ${chainNameEnColumn}`)
      .eq(chainIdColumnChain, brandData.chain_id)
      .single()
    
    if (chainRes.data) {
      // 조회된 데이터를 표준 형식으로 변환
      chainData = {
        chain_id: chainRes.data[chainIdColumnChain as keyof typeof chainRes.data],
        name_kr: chainRes.data[chainNameKrColumn as keyof typeof chainRes.data],
        name_en: chainRes.data[chainNameEnColumn as keyof typeof chainRes.data]
      }
    }
  }
}
```

### 2. **호텔 편집 폼 수정**
```typescript
// 초기 데이터에서 체인 정보 설정 (hotel_chains 테이블에서 조회된 실제 데이터)
const [selectedChain, setSelectedChain] = React.useState<Chain | null>(() => {
  if (initialData.hotel_chains) {
    const chains = initialData.hotel_chains as Record<string, unknown> | null
    
    return chains ? {
      chain_id: Number(chains.chain_id ?? 0),
      name_kr: String(chains.name_kr ?? ''),
      name_en: String(chains.name_en ?? '')
    } : null
  }
  return null
})
```

### 3. **UI 표시 개선**
```typescript
{/* 체인 필드 */}
<div className="space-y-1">
  <div className="flex items-center justify-between">
    <label className="block text-sm font-medium text-gray-700">체인</label>
    {selectedChain?.chain_id && (
      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
        ID: {selectedChain.chain_id}
      </span>
    )}
  </div>
  <div className="flex gap-2">
    <div className="flex-1 px-3 py-2 text-sm rounded-md border border-gray-200">
      {selectedChain?.name_kr || '-'}
    </div>
    <div className="flex-1 px-3 py-2 text-sm rounded-md border border-gray-200">
      {selectedChain?.name_en || '-'}
    </div>
  </div>
  {/* 디버깅 정보 */}
  {String(initialData.sabre_id ?? '') === '313016' && (
    <div className="text-xs text-gray-400 mt-1">
      선택된 체인: {selectedChain ? `${selectedChain.chain_id} (${selectedChain.name_kr})` : '없음'}
      <br />
      hotel_chains 데이터: {initialData.hotel_chains ? '있음' : '없음'}
    </div>
  )}
</div>
```

## 🛠️ **수정된 파일들**

### **Repository 함수**
- `src/features/hotels/lib/repository.ts` - `hotel_brands`의 `chain_id`로 `hotel_chains` 조회 로직 개선

### **호텔 편집 폼**
- `src/app/admin/hotel-update/[sabre]/hotel-edit-form.tsx` - 체인 정보를 `hotel_chains` 테이블 데이터로 초기화

## 🔧 **테스트 방법**

### 1. **데이터 조회 확인**
1. 브라우저 개발자 도구 콘솔 열기
2. Sabre ID 313016인 호텔 페이지 접근
3. Repository 로그에서 체인 정보 조회 결과 확인

### 2. **체인 정보 표시 확인**
1. 호텔 편집 화면에서 체인 필드 확인
2. `chain_name_kr`, `chain_name_en` 값이 올바르게 표시되는지 확인
3. 디버깅 정보에서 체인 데이터 상태 확인

### 3. **로그 확인**
- `=== Repository 브랜드 조회 디버깅 ===`
- `hotel_chains 테이블 컬럼: [...]`
- `체인 컬럼 매핑: {...}`
- `hotel_chains 테이블 조회 결과: ...`
- `최종 chainData: ...`

## 📋 **로그 확인 포인트**

### **Repository 로그**
- `=== Repository 브랜드 조회 디버깅 ===`
- `hotel_brands 테이블 컬럼: [...]`
- `브랜드 컬럼 매핑: {...}`
- `hotel_chains 테이블 컬럼: [...]`
- `체인 컬럼 매핑: {...}`
- `hotel_chains 테이블 조회 결과: ...`
- `최종 chainData: ...`

### **호텔 편집 폼 로그**
- `=== selectedChain 초기화 디버깅 ===`
- `initialData.hotel_chains: ...`
- `chains.chain_id: ...`
- `chains.name_kr: ...`
- `chains.name_en: ...`

## 🎯 **예상 결과**

### **수정 전**
- 체인 필드에 값이 표시되지 않음
- `hotel_chains` 테이블의 실제 데이터를 사용하지 않음
- 체인 이름이 빈 문자열로 표시됨

### **수정 후**
- 체인 필드에 `chain_name_kr`, `chain_name_en` 값이 올바르게 표시됨
- `hotel_brands` → `hotel_chains` 연결을 통한 완전한 체인 정보 조회
- 체인 ID와 이름이 모두 표시됨

## 🔍 **문제 해결 체크리스트**

- [ ] Repository에서 `hotel_chains` 테이블 조회 로그 확인
- [ ] 체인 컬럼 매핑 로그 확인
- [ ] 호텔 편집 폼에서 체인 정보 초기화 확인
- [ ] UI에 체인 이름이 표시되는지 확인
- [ ] 디버깅 정보에서 체인 데이터 상태 확인

## 📞 **추가 지원**

문제가 지속되면 다음을 확인하세요:
1. Supabase 테이블의 `hotel_chains` 구조
2. Repository 함수의 체인 정보 조회 로그
3. 호텔 편집 폼의 체인 정보 초기화 로그
4. 브라우저 개발자 도구의 네트워크 탭

## 🔄 **데이터 흐름 요약**

```
select_hotels (brand_id) → hotel_brands (chain_id) → hotel_chains (chain_name_kr, chain_name_en)
```

1. **`select_hotels`**: `brand_id` 컬럼으로 브랜드 식별
2. **`hotel_brands`**: `brand_id`로 `chain_id` 조회
3. **`hotel_chains`**: `chain_id`로 `chain_name_kr`, `chain_name_en` 조회
4. **UI 표시**: 조회된 체인 이름을 체인 필드에 표시

이제 체인 필드에 `hotel_chains` 테이블의 `chain_name_kr`, `chain_name_en` 값이 올바르게 표시될 것입니다.
