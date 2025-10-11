# SQL Scripts

도시 이미지 관리 및 체인 브랜드 관리 기능을 위한 데이터베이스 마이그레이션 스크립트 모음

## 📁 파일 목록

### 🗺️ 지역 코드 맵핑 - 중복 방지 (중요!)
- **ADD_UNIQUE_CONSTRAINTS_TO_REGIONS.sql** ⚠️ **중요!**
  - `select_regions` 테이블에 유니크 제약 조건 추가
  - 각 region_type별로 코드 중복 방지 (city_code, country_code, continent_code, region_code)
  - 기존 중복 레코드 제거 후 유니크 인덱스 생성
  - **상태:** ⚠️ **실행 권장** (중복 key 에러 해결)

### 🏙️ 도시 이미지 관리
- **CREATE_SELECT_CITY_MEDIA_TABLE.sql**
  - 도시 이미지 메타데이터를 저장하는 `select_city_media` 테이블 생성
  - 도시별 이미지 업로드/관리 기능에 필요
  - **상태:** ✅ **이미 생성됨**

### 🏨 체인 브랜드 관리
- **FIX_STATUS_WHITESPACE.sql** ⚠️ **권장!**
  - `hotel_chains`, `hotel_brands` 테이블의 `status` 값에서 개행 문자(`\r\n`) 제거
  - 상태 필터링 정상 작동에 필요
  - **상태:** ⚠️ **실행 권장** (상태 값에 `\r\n` 포함 시)

## 🚀 실행 순서 (권장)

### 권장 스크립트 (즉시 실행):
```bash
1. ADD_UNIQUE_CONSTRAINTS_TO_REGIONS.sql  # 중복 레코드 제거 및 유니크 제약 조건 추가
2. FIX_STATUS_WHITESPACE.sql              # status 값 정리
```

### 이미 실행됨:
```bash
✅ CREATE_SELECT_CITY_MEDIA_TABLE.sql     # 도시 이미지 테이블 (이미 생성됨)
```

### 선택적 스크립트:
```bash
- FIX_SORT_ORDER_COLUMN_TYPE.sql          # sort_order 범위 에러 발생 시
```

## 📖 사용 방법

1. **Supabase Dashboard** 접속
2. **SQL Editor** 열기
3. 해당 `.sql` 파일 내용 복사
4. **Run** 버튼 클릭
5. 성공 메시지 확인

## ⚠️ 주의사항

- `CREATE TABLE IF NOT EXISTS`를 사용하므로 중복 실행해도 안전
- 프로덕션 환경에서는 실행 전 백업 권장
- 각 스크립트는 독립적으로 실행 가능

