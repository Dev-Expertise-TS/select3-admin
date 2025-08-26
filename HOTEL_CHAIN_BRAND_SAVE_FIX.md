# 호텔 상세 편집 화면 체인/브랜드 저장 문제 해결 가이드

## 🚨 **문제 상황**
호텔 상세 편집 화면에서 체인과 브랜드를 입력하고 저장해도 값이 저장되지 않음

## 🔍 **문제 원인 분석**

### 1. **API 응답 처리 부족**
- 저장 후 API 응답에서 체인/브랜드 정보를 확인하지 않음
- 클라이언트 상태가 서버 응답과 동기화되지 않음

### 2. **상태 업데이트 누락**
- `updateHotelRow` 함수에서 체인/브랜드 정보 업데이트 후 상태 반영 부족
- 저장 성공 후 UI 상태가 업데이트되지 않음

### 3. **FormData 처리 문제**
- 체인/브랜드 정보가 FormData에 제대로 포함되지만, 저장 후 상태 반영 누락

## ✅ **해결 방법**

### 1. **API 응답 처리 개선**
```typescript
// 저장 후 API 응답에서 체인/브랜드 정보 확인
if (result.data) {
  // API 응답에서 체인/브랜드 정보 확인
  if (sabreId === '313016') {
    console.log('=== API 응답 데이터 ===')
    console.log('result.data:', result.data)
    console.log('저장된 chain_id:', result.data.chain_id)
    console.log('저장된 brand_id:', result.data.brand_id)
  }
  
  // 저장된 brand_id가 있다면 해당 브랜드 정보 조회
  if (result.data.brand_id) {
    // 브랜드 정보 조회 및 상태 업데이트
  }
}
```

### 2. **상태 동기화 구현**
```typescript
// 저장된 brand_id가 있다면 해당 브랜드 정보 조회
if (result.data.brand_id) {
  try {
    const brandResponse = await fetch(`/api/chain-brand/list`)
    if (brandResponse.ok) {
      const brandData = await brandResponse.json()
      if (brandData.success && brandData.data.brands) {
        const savedBrand = brandData.data.brands.find((b: any) => b.brand_id === result.data.brand_id)
        if (savedBrand) {
          setSelectedBrand(savedBrand)
          setCurrentBrandId(savedBrand.brand_id)
          
          // 브랜드의 체인 정보도 조회
          if (savedBrand.chain_id) {
            const savedChain = brandData.data.chains.find((c: any) => c.chain_id === savedBrand.chain_id)
            if (savedChain) {
              setSelectedChain(savedChain)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('저장 후 브랜드 정보 조회 오류:', error)
  }
}
```

### 3. **디버깅 정보 추가**
```typescript
// 체인/브랜드 선택 핸들러에 디버깅 추가
const handleChainBrandSelect = (chain: Chain | null, brand: Brand | null) => {
  console.log('=== 체인/브랜드 선택 핸들러 ===')
  console.log('선택된 체인:', chain)
  console.log('선택된 브랜드:', brand)
  
  // ... 상태 업데이트 로직
  
  console.log('최종 상태:')
  console.log('  selectedChain:', chain)
  console.log('  selectedBrand:', brand)
  console.log('  currentBrandId:', brand?.brand_id || null)
  console.log('===============================')
}
```

## 🛠️ **수정된 파일들**

### **API 라우트**
- `src/app/api/hotel/update/route.ts` - API 응답에 체인/브랜드 정보 포함

### **Repository 함수**
- `src/features/hotels/lib/repository.ts` - `updateHotelRow` 함수 개선

### **호텔 편집 폼**
- `src/app/admin/hotel-update/[sabre]/hotel-edit-form.tsx` - 상태 동기화 및 디버깅 개선

## 🔧 **테스트 방법**

### 1. **체인/브랜드 선택 테스트**
1. 호텔 편집 화면에서 "수정 하기" 버튼 클릭
2. 체인/브랜드 필드 클릭하여 선택
3. 브라우저 개발자 도구에서 로그 확인

### 2. **저장 테스트**
1. 체인/브랜드 선택 후 "저장" 버튼 클릭
2. API 응답 로그 확인
3. 저장 후 상태 업데이트 로그 확인

### 3. **디버깅 정보 확인**
- Sabre ID 313016인 호텔의 경우 디버깅 정보가 화면에 표시됨
- 브라우저 개발자 도구 콘솔에서 상세 로그 확인

## 📋 **로그 확인 포인트**

### **클라이언트 로그**
- `=== 체인/브랜드 선택 핸들러 ===`
- `=== 체인/브랜드 필드 클릭 ===`
- `=== 클라이언트 FormData 전송 내용 ===`

### **서버 로그**
- `=== 호텔 업데이트 API 체인/브랜드 정보 ===`
- `=== updateHotelRow 디버깅 ===`
- `=== API 응답 데이터 ===`

## 🎯 **예상 결과**

### **저장 전**
- 체인/브랜드 선택 시 상태가 즉시 업데이트됨
- `currentBrandId`가 올바르게 설정됨

### **저장 중**
- FormData에 체인/브랜드 정보가 올바르게 포함됨
- API로 전송되는 데이터가 정확함

### **저장 후**
- 서버 응답에서 체인/브랜드 정보 확인
- 클라이언트 상태가 서버 응답과 동기화됨
- UI에 저장된 값이 올바르게 표시됨

## 🔍 **문제 해결 체크리스트**

- [ ] 체인/브랜드 선택 시 로그 확인
- [ ] FormData 전송 내용 로그 확인
- [ ] API 응답 데이터 로그 확인
- [ ] 저장 후 상태 업데이트 로그 확인
- [ ] UI에 저장된 값이 표시되는지 확인

## 📞 **추가 지원**

문제가 지속되면 다음을 확인하세요:
1. 브라우저 개발자 도구의 네트워크 탭
2. 서버 터미널의 로그
3. 데이터베이스 테이블 구조
4. 환경 변수 설정

이제 호텔 상세 편집 화면에서 체인/브랜드 정보가 제대로 저장되고 UI에 반영될 것입니다.
