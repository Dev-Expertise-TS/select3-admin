# `name_en` 컬럼 문제 해결 가이드

## 🚨 **문제 상황**
브랜드 추가 시 "Could not find the 'name_en' column of 'hotel_brands' in the schema cache" 오류 발생

## 🔍 **문제 원인**
실제 데이터베이스 테이블 `hotel_brands`에 `name_en` 컬럼이 존재하지 않음

## ✅ **해결 방법**

### 1. **동적 컬럼 매핑 시스템 구현**
- 런타임에 실제 테이블 구조 확인
- 존재하는 컬럼만 사용하여 데이터 처리
- `name_en` 컬럼이 없는 경우 자동으로 처리

### 2. **API 수정 (`/api/chain-brand/brand/save`)**
```typescript
// 테이블 구조 확인
const { data: sampleData } = await supabase
  .from('hotel_brands')
  .select('*')
  .limit(1)

// 실제 컬럼명 찾기
const actualColumns = Object.keys(sampleData[0] || {})
const nameEnColumn = actualColumns.find(col => 
  col.toLowerCase().includes('name') && col.toLowerCase().includes('en')
) || null

// 조건부로 컬럼 추가
const insertData: any = { [chainIdColumn]: chain_id }
if (nameKrColumn) insertData[nameKrColumn] = name_kr || null
if (nameEnColumn) insertData[nameEnColumn] = name_en || null
```

### 3. **클라이언트 수정 (`ChainBrandManager`)**
```typescript
// name_en 컬럼 존재 여부 확인
const hasNameEn = React.useMemo(() => {
  return brands.length > 0 && brands[0].hasOwnProperty('name_en')
}, [brands])

// 조건부로 name_en 입력 필드 표시
{hasNameEn && (
  <input form={createFormId} name="name_en" placeholder="브랜드(영문)" />
)}

// 조건부로 name_en 데이터 전송
if (hasNameEn) {
  fd.append('name_en', nen)
}
```

## 🛠️ **적용된 수정 사항**

### **API 라우트**
- `src/app/api/chain-brand/brand/save/route.ts`
- `src/app/api/chain-brand/list/route.ts`

### **페이지 컴포넌트**
- `src/app/admin/chain-brand/page.tsx`

### **관리자 컴포넌트**
- `src/app/admin/chain-brand/_components/ChainBrandManager.tsx`

## 🔧 **테스트 방법**

### 1. **스키마 확인**
```
/admin/chain-brand/schema-test
```
이 페이지에서 실제 테이블 구조를 확인할 수 있습니다.

### 2. **브랜드 추가 테스트**
1. 체인 선택
2. "브랜드 추가" 버튼 클릭
3. 브랜드(한글) 입력 (필수)
4. 브랜드(영문) 입력 (선택사항 - 컬럼이 있는 경우만)
5. 저장

### 3. **로그 확인**
브라우저 개발자 도구와 서버 터미널에서 다음 로그 확인:
- `[chain-brand][brand/save] actual columns: [...]`
- `[chain-brand][brand/save] column mapping: {...}`
- `[brand][client] new brand values: {...}`

## 📋 **지원하는 컬럼 패턴**

### **ID 컬럼**
- `brand_id`, `id`, `brandId`, `brandid`
- `chain_id`, `id`, `chainId`, `chainid`

### **이름 컬럼**
- `name_kr`, `name_kr`, `brand_name_kr`, `chain_name_kr`
- `name_ko`, `name_ko`, `brand_name_ko`, `chain_name_ko`
- `name_en`, `name_en`, `brand_name_en`, `chain_name_en`

## 🎯 **예상 결과**

### **name_en 컬럼이 있는 경우**
- 브랜드(한글)와 브랜드(영문) 모두 입력 가능
- 두 필드 모두 표시됨

### **name_en 컬럼이 없는 경우**
- 브랜드(한글)만 입력 가능
- 브랜드(영문) 필드는 표시되지 않음
- 에러 없이 정상 작동

## 🔍 **문제 해결 체크리스트**

- [ ] 스키마 테스트 페이지에서 실제 컬럼 확인
- [ ] API 로그에서 컬럼 매핑 결과 확인
- [ ] 클라이언트에서 hasNameEn 값 확인
- [ ] 브랜드 추가 시 에러 메시지 확인
- [ ] 새로 생성된 브랜드가 목록에 표시되는지 확인

## 📞 **추가 지원**

문제가 지속되면 다음을 확인하세요:
1. Supabase 테이블 구조
2. 환경 변수 설정
3. 서버 로그의 상세 에러 정보
4. 브라우저 개발자 도구의 네트워크 탭

이제 `name_en` 컬럼이 없는 테이블에서도 브랜드 추가가 정상적으로 작동할 것입니다.
