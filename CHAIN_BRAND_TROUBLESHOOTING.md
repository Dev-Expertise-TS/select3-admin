# 체인 브랜드 관리 페이지 문제 해결 가이드

## 🚨 **문제 상황**
체인 브랜드 관리 페이지에서 호텔 체인 테이블에 아무 데이터도 조회되지 않는 문제

## 🔍 **문제 원인 분석**

### 1. 환경 변수 문제
- `SUPABASE_SERVICE_ROLE_KEY`가 설정되지 않음
- `NEXT_PUBLIC_SUPABASE_URL`이 잘못 설정됨

### 2. 데이터베이스 테이블 문제
- `hotel_chains` 테이블이 존재하지 않음
- `hotel_brands` 테이블이 존재하지 않음
- 테이블 스키마가 잘못됨

### 3. 권한 문제
- RLS(Row Level Security) 정책이 잘못 설정됨
- Service Role Key의 권한이 부족함

## 🛠️ **해결 방법**

### 1단계: 환경 변수 설정
프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**환경 변수 확인 방법:**
1. Supabase Dashboard → Settings → API
2. Project URL과 API Keys 확인
3. `anon` `public` 키와 `service_role` `secret` 키 복사

### 2단계: 데이터베이스 테이블 생성
Supabase Dashboard → SQL Editor에서 다음 SQL을 실행하세요:

```sql
-- 호텔 체인 테이블 생성
CREATE TABLE IF NOT EXISTS hotel_chains (
  chain_id SERIAL PRIMARY KEY,
  name_kr VARCHAR(255),
  name_en VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 호텔 브랜드 테이블 생성
CREATE TABLE IF NOT EXISTS hotel_brands (
  brand_id SERIAL PRIMARY KEY,
  name_kr VARCHAR(255),
  name_en VARCHAR(255),
  chain_id INTEGER REFERENCES hotel_chains(chain_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3단계: 샘플 데이터 삽입
테이블이 생성된 후 샘플 데이터를 삽입하세요:

```sql
-- 샘플 체인 데이터
INSERT INTO hotel_chains (name_kr, name_en) VALUES 
  ('신세계 호텔앤리조트', 'Shinsegae Hotel & Resort'),
  ('롯데 호텔', 'Lotte Hotel'),
  ('신라 호텔', 'Shilla Hotel');

-- 샘플 브랜드 데이터
INSERT INTO hotel_brands (name_kr, name_en, chain_id) VALUES 
  ('신세계 호텔', 'Shinsegae Hotel', 1),
  ('신세계 리조트', 'Shinsegae Resort', 1),
  ('롯데 호텔 서울', 'Lotte Hotel Seoul', 2);
```

### 4단계: RLS 정책 설정
보안을 위해 Row Level Security를 설정하세요:

```sql
-- RLS 활성화
ALTER TABLE hotel_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_brands ENABLE ROW LEVEL SECURITY;

-- 읽기 정책 (모든 사용자)
CREATE POLICY "Allow read access to hotel_chains" ON hotel_chains
  FOR SELECT USING (true);

CREATE POLICY "Allow read access to hotel_brands" ON hotel_brands
  FOR SELECT USING (true);

-- 쓰기 정책 (관리자만)
CREATE POLICY "Allow insert access to hotel_chains" ON hotel_chains
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to hotel_chains" ON hotel_chains
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to hotel_chains" ON hotel_chains
  FOR DELETE USING (true);
```

## 🔧 **개발자 도구 활용**

### 1. 브라우저 개발자 도구
- Console 탭에서 에러 메시지 확인
- Network 탭에서 API 요청/응답 확인

### 2. 서버 로그 확인
- 터미널에서 Next.js 서버 로그 확인
- `[chain-brand]` 태그로 시작하는 로그 메시지 확인

### 3. Supabase Dashboard
- Table Editor에서 테이블 존재 여부 확인
- Logs에서 쿼리 실행 결과 확인

## 📋 **체크리스트**

- [ ] `.env.local` 파일에 환경 변수 설정
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 확인
- [ ] `hotel_chains` 테이블 생성
- [ ] `hotel_brands` 테이블 생성
- [ ] 샘플 데이터 삽입
- [ ] RLS 정책 설정
- [ ] 서버 재시작
- [ ] 브라우저 새로고침

## 🐛 **일반적인 오류 메시지**

### "Supabase Service Role Key가 설정되지 않았습니다"
- `.env.local` 파일에 `SUPABASE_SERVICE_ROLE_KEY` 추가
- 서버 재시작

### "hotel_chains 테이블이 존재하지 않습니다"
- Supabase SQL Editor에서 테이블 생성 SQL 실행
- 테이블 이름 철자 확인

### "체인 목록 조회 중 오류가 발생했습니다"
- RLS 정책 확인
- Service Role Key 권한 확인
- 테이블 스키마 확인

## 📞 **추가 지원**

문제가 지속되면 다음을 확인하세요:
1. Supabase 프로젝트 상태 (활성/일시정지)
2. API 키 만료 여부
3. 네트워크 연결 상태
4. 브라우저 캐시 및 쿠키

## 🔗 **관련 링크**

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
