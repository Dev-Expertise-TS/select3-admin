-- ====================================================
-- hotel_chains 및 hotel_brands 테이블 컬럼 추가/수정
-- ====================================================

-- 1. hotel_chains 테이블
-- ====================================================

-- chain_sort_order 컬럼 추가 (정렬 순서)
ALTER TABLE hotel_chains
ADD COLUMN IF NOT EXISTS chain_sort_order INTEGER;

-- status 컬럼 추가 (활성/비활성)
ALTER TABLE hotel_chains
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_hotel_chains_sort_order ON hotel_chains(chain_sort_order);
CREATE INDEX IF NOT EXISTS idx_hotel_chains_status ON hotel_chains(status);


-- 2. hotel_brands 테이블
-- ====================================================

-- brand_sort_order 컬럼 추가 (정렬 순서)
ALTER TABLE hotel_brands
ADD COLUMN IF NOT EXISTS brand_sort_order INTEGER;

-- status 컬럼 추가 (활성/비활성)
ALTER TABLE hotel_brands
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_hotel_brands_sort_order ON hotel_brands(brand_sort_order);
CREATE INDEX IF NOT EXISTS idx_hotel_brands_status ON hotel_brands(status);


-- 3. 확인
-- ====================================================

-- 추가된 컬럼 확인
SELECT 
  table_name, 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('hotel_chains', 'hotel_brands')
  AND (column_name LIKE '%sort_order%' OR column_name = 'status')
ORDER BY table_name, column_name;

-- 샘플 데이터 확인
SELECT chain_id, chain_name_ko, chain_sort_order, status 
FROM hotel_chains 
LIMIT 5;

SELECT brand_id, brand_name_ko, brand_sort_order, status 
FROM hotel_brands 
LIMIT 5;

