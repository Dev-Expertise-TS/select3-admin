-- ====================================================
-- 체인 및 브랜드 상태 확인
-- ====================================================

-- 1. hotel_chains 테이블 status 컬럼 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'hotel_chains' 
  AND column_name = 'status';

-- 2. hotel_brands 테이블 status 컬럼 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'hotel_brands' 
  AND column_name = 'status';

-- 3. 체인 데이터 샘플 확인
SELECT 
  chain_id,
  chain_name_ko,
  chain_name_en,
  status,
  chain_sort_order
FROM hotel_chains
ORDER BY chain_id DESC
LIMIT 10;

-- 4. 브랜드 데이터 샘플 확인
SELECT 
  brand_id,
  brand_name_ko,
  brand_name_en,
  chain_id,
  status,
  brand_sort_order
FROM hotel_brands
ORDER BY brand_id DESC
LIMIT 10;

-- 5. 상태별 카운트
SELECT 
  status,
  COUNT(*) as count
FROM hotel_chains
GROUP BY status;

SELECT 
  status,
  COUNT(*) as count
FROM hotel_brands
GROUP BY status;

-- 6. 수동 테스트: 특정 브랜드의 status 업데이트
-- UPDATE hotel_brands
-- SET status = 'active'
-- WHERE brand_id = 1;

-- 7. 업데이트 후 확인
-- SELECT brand_id, brand_name_ko, status
-- FROM hotel_brands
-- WHERE brand_id = 1;

