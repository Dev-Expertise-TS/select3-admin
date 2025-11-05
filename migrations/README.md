# Database Migrations

이 폴더는 데이터베이스 마이그레이션 SQL 파일을 포함합니다.

## 실행 방법

### Supabase Dashboard 사용

1. [Supabase Dashboard](https://app.supabase.com) 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭
4. **New Query** 클릭
5. 아래 파일의 내용을 복사하여 붙여넣기
6. **Run** 버튼 클릭

### 마이그레이션 파일 목록

#### `create_hotel_media_version_table.sql`
**목적**: 호텔 이미지 버전 관리 테이블 생성

**실행 시기**: 
- 호텔 이미지 관리 페이지 사용 전
- 콘솔에 "테이블이 존재하지 않음" 메시지가 표시될 때

**테이블 구조**:
- `slug` (TEXT, PRIMARY KEY): 호텔 slug
- `sabre_id` (TEXT): 호텔 Sabre ID
- `version` (INTEGER): 이미지 버전 번호
- `created_at` (TIMESTAMPTZ): 생성 시각
- `updated_at` (TIMESTAMPTZ): 마지막 업데이트 시각

**기능**:
- 호텔 이미지가 업데이트될 때마다 버전이 자동 증가
- 브라우저 캐시 무효화를 위해 사용
- 자동 타임스탬프 업데이트 트리거 포함

## 주의사항

- 마이그레이션은 순서대로 실행해야 합니다.
- 이미 존재하는 테이블은 `CREATE TABLE IF NOT EXISTS`로 보호됩니다.
- 실행 전 백업을 권장합니다.

## 롤백

테이블을 제거하려면:

```sql
DROP TABLE IF EXISTS select_hotel_media_version CASCADE;
DROP FUNCTION IF EXISTS update_select_hotel_media_version_updated_at() CASCADE;
```

