-- 체인 브랜드 관리 테이블 생성 SQL
-- Supabase SQL Editor에서 실행하세요

-- 1. 호텔 체인 테이블 생성
CREATE TABLE IF NOT EXISTS hotel_chains (
  chain_id SERIAL PRIMARY KEY,
  name_kr VARCHAR(255),
  name_en VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 호텔 브랜드 테이블 생성
CREATE TABLE IF NOT EXISTS hotel_brands (
  brand_id SERIAL PRIMARY KEY,
  name_kr VARCHAR(255),
  name_en VARCHAR(255),
  chain_id INTEGER REFERENCES hotel_chains(chain_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 업데이트 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. 업데이트 트리거 생성
CREATE TRIGGER update_hotel_chains_updated_at 
  BEFORE UPDATE ON hotel_chains 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotel_brands_updated_at 
  BEFORE UPDATE ON hotel_brands 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 샘플 데이터 삽입 (선택사항)
INSERT INTO hotel_chains (name_kr, name_en) VALUES 
  ('신세계 호텔앤리조트', 'Shinsegae Hotel & Resort'),
  ('롯데 호텔', 'Lotte Hotel'),
  ('신라 호텔', 'Shilla Hotel')
ON CONFLICT DO NOTHING;

INSERT INTO hotel_brands (name_kr, name_en, chain_id) VALUES 
  ('신세계 호텔', 'Shinsegae Hotel', 1),
  ('신세계 리조트', 'Shinsegae Resort', 1),
  ('롯데 호텔 서울', 'Lotte Hotel Seoul', 2),
  ('롯데 호텔 부산', 'Lotte Hotel Busan', 2),
  ('신라 호텔 서울', 'Shilla Hotel Seoul', 3)
ON CONFLICT DO NOTHING;

-- 6. 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_hotel_chains_name_kr ON hotel_chains(name_kr);
CREATE INDEX IF NOT EXISTS idx_hotel_chains_name_en ON hotel_chains(name_en);
CREATE INDEX IF NOT EXISTS idx_hotel_brands_chain_id ON hotel_brands(chain_id);
CREATE INDEX IF NOT EXISTS idx_hotel_brands_name_kr ON hotel_brands(name_kr);
CREATE INDEX IF NOT EXISTS idx_hotel_brands_name_en ON hotel_brands(name_en);

-- 7. RLS 정책 설정 (보안)
ALTER TABLE hotel_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_brands ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능하도록 정책 설정
CREATE POLICY "Allow read access to hotel_chains" ON hotel_chains
  FOR SELECT USING (true);

CREATE POLICY "Allow read access to hotel_brands" ON hotel_brands
  FOR SELECT USING (true);

-- 관리자만 쓰기 가능하도록 정책 설정 (실제 구현에서는 사용자 역할 확인 필요)
CREATE POLICY "Allow insert access to hotel_chains" ON hotel_chains
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to hotel_chains" ON hotel_chains
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to hotel_chains" ON hotel_chains
  FOR DELETE USING (true);

CREATE POLICY "Allow insert access to hotel_brands" ON hotel_brands
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to hotel_brands" ON hotel_brands
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to hotel_brands" ON hotel_brands
  FOR DELETE USING (true);
