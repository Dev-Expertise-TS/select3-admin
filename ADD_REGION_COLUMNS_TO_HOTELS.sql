-- select_hotels 테이블에 지역 관련 컬럼 추가
-- Supabase SQL Editor에서 실행하세요

-- 도시 관련 컬럼
ALTER TABLE select_hotels 
ADD COLUMN IF NOT EXISTS city_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS city_ko VARCHAR(255),
ADD COLUMN IF NOT EXISTS city_en VARCHAR(255);

-- 국가 관련 컬럼
ALTER TABLE select_hotels 
ADD COLUMN IF NOT EXISTS country_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS country_ko VARCHAR(255),
ADD COLUMN IF NOT EXISTS country_en VARCHAR(255);

-- 대륙 관련 컬럼
ALTER TABLE select_hotels 
ADD COLUMN IF NOT EXISTS continent_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS continent_ko VARCHAR(255),
ADD COLUMN IF NOT EXISTS continent_en VARCHAR(255);

-- 지역 관련 컬럼 (region)
ALTER TABLE select_hotels 
ADD COLUMN IF NOT EXISTS region_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS region_ko VARCHAR(255),
ADD COLUMN IF NOT EXISTS region_en VARCHAR(255);

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_select_hotels_city_code ON select_hotels(city_code);
CREATE INDEX IF NOT EXISTS idx_select_hotels_country_code ON select_hotels(country_code);
CREATE INDEX IF NOT EXISTS idx_select_hotels_continent_code ON select_hotels(continent_code);
CREATE INDEX IF NOT EXISTS idx_select_hotels_region_code ON select_hotels(region_code);

-- 한글/영문 이름으로도 검색할 수 있도록 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_select_hotels_city_ko ON select_hotels(city_ko);
CREATE INDEX IF NOT EXISTS idx_select_hotels_city_en ON select_hotels(city_en);
CREATE INDEX IF NOT EXISTS idx_select_hotels_country_ko ON select_hotels(country_ko);
CREATE INDEX IF NOT EXISTS idx_select_hotels_country_en ON select_hotels(country_en);
CREATE INDEX IF NOT EXISTS idx_select_hotels_continent_ko ON select_hotels(continent_ko);
CREATE INDEX IF NOT EXISTS idx_select_hotels_continent_en ON select_hotels(continent_en);

-- 확인 쿼리
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'select_hotels' 
  AND column_name IN (
    'city_code', 'city_ko', 'city_en',
    'country_code', 'country_ko', 'country_en',
    'continent_code', 'continent_ko', 'continent_en',
    'region_code', 'region_ko', 'region_en'
  )
ORDER BY column_name;

