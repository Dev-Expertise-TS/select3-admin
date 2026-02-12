# 체인 브랜드 관리 페이지 API 컬럼명 오류 해결 가이드

## 🚨 **문제 상황**
```
Internal server error
체인 브랜드 관리 페이지에서 호텔 체인 영역의 호텔 체인(한글), 호텔 체인(영문) 필드를 수정한 후 저장 버튼을 누르니 위와 같은 오류가 발생
```

## 🔍 **문제 원인 분석**

### 1. **컬럼명 불일치**
- API에서 `name_kr`, `name_en` 컬럼 사용
- 실제 테이블에는 `chain_name_kr`, `chain_name_en` 컬럼 존재
- Supabase에서 존재하지 않는 컬럼에 업데이트 시도

### 2. **오류 메시지**
```
[chain-save] error: {
  code: 'PGRST204',
  details: null,
  hint: null,
  message: "Could not find the 'name_en' column of 'hotel_chains' in the schema cache"
}
```

### 3. **영향받는 API**
- `POST /api/chain-brand/chain/save` - 체인 수정
- `POST /api/chain-brand/chain/create` - 체인 생성

## ✅ **해결 방법**

### 1. **체인 저장 API 수정**
```typescript
// 수정 전 (잘못된 컬럼명)
.update({ name_kr: name_kr || null, name_en: name_en || null })

// 수정 후 (올바른 컬럼명)
.update({ chain_name_kr: name_kr || null, chain_name_en: name_en || null })
```

### 2. **체인 생성 API 수정**
```typescript
// 수정 전 (잘못된 컬럼명)
.insert({ name_kr: name_kr || null, name_en: name_en || null })

// 수정 후 (올바른 컬럼명)
.insert({ chain_name_kr: name_kr || null, chain_name_en: name_en || null })
```

### 3. **컬럼명 매핑**
- **`name_kr`** → **`chain_name_kr`**
- **`name_en`** → **`chain_name_en`**

## 🛠️ **수정된 파일들**

### **체인 저장 API**
- `src/app/api/chain-brand/chain/save/route.ts` - `chain_name_kr`, `chain_name_en` 컬럼 사용

### **체인 생성 API**
- `src/app/api/chain-brand/chain/create/route.ts` - `chain_name_kr`, `chain_name_en` 컬럼 사용

## 🔧 **테스트 방법**

### 1. **체인 수정 테스트**
1. 체인 브랜드 관리 페이지 접근
2. 기존 체인의 한글/영문 이름 수정
3. 저장 버튼 클릭
4. 오류 없이 저장 성공 확인

### 2. **체인 생성 테스트**
1. 체인 브랜드 관리 페이지에서 새 체인 추가
2. 체인(한글), 체인(영문) 입력
3. 저장 버튼 클릭
4. 오류 없이 생성 성공 확인

### 3. **로그 확인**
- `[chain-save] error:` 로그가 더 이상 나타나지 않음
- `[chain-create] error:` 로그가 더 이상 나타나지 않음
- API 응답에서 `success: true` 확인

## 📋 **로그 확인 포인트**

### **체인 저장 API**
- `[chain-save] error:` - 오류 발생 여부
- API 응답 상태 코드 (500 → 200)

### **체인 생성 API**
- `[chain-create] error:` - 오류 발생 여부
- API 응답 상태 코드 (500 → 201)

## 🎯 **예상 결과**

### **수정 전**
- `Could not find the 'name_en' column of 'hotel_chains'` 오류 발생
- Internal server error (500) 응답
- 체인 정보 저장/수정 불가

### **수정 후**
- 컬럼명 오류 없음
- 정상적인 저장/수정 성공 (200/201 응답)
- 체인 정보가 올바르게 저장됨

## 🔍 **문제 해결 체크리스트**

- [ ] 체인 저장 API에서 `chain_name_kr`, `chain_name_en` 컬럼 사용 확인
- [ ] 체인 생성 API에서 `chain_name_kr`, `chain_name_en` 컬럼 사용 확인
- [ ] 체인 수정 시 오류 없이 저장 성공 확인
- [ ] 새 체인 생성 시 오류 없이 생성 성공 확인
- [ ] API 응답에서 `success: true` 확인

## 📞 **추가 지원**

문제가 지속되면 다음을 확인하세요:
1. Supabase 테이블의 `hotel_chains` 구조
2. 브라우저 개발자 도구의 네트워크 탭
3. 서버 로그에서 API 오류 메시지
4. 체인 브랜드 관리 페이지의 JavaScript 콘솔

## 🔄 **데이터 흐름 요약**

```
UI 입력 → FormData → API 처리 → 올바른 컬럼명으로 DB 업데이트 → 성공 응답
```

1. **UI 입력**: 체인(한글), 체인(영문) 필드 값 입력
2. **FormData**: `name_kr`, `name_en` 값 전송
3. **API 처리**: `chain_name_kr`, `chain_name_en` 컬럼으로 변환
4. **DB 업데이트**: 올바른 컬럼명으로 데이터 저장
5. **성공 응답**: `success: true` 반환

## 📊 **테이블 구조 요약**

### **`hotel_chains` 테이블**
- **`chain_id`**: 체인 고유 식별자
- **`chain_name_kr`**: 체인명(한글)
- **`chain_name_en`**: 체인명(영문)
- **`description`**: 체인 설명
- **`headquarters`**: 본사 정보
- **`created_at`**: 생성 일시
- **`slug`**: URL 슬러그

이제 체인 브랜드 관리 페이지에서 호텔 체인 정보를 오류 없이 저장하고 수정할 수 있습니다.

