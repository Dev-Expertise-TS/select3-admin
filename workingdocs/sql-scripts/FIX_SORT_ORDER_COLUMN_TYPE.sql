-- select_regions 테이블의 sort_order 컬럼 타입을 INTEGER로 변경
-- smallint (-32,768 ~ 32,767) → INTEGER (-2,147,483,648 ~ 2,147,483,647)

-- city_sort_order
ALTER TABLE select_regions 
ALTER COLUMN city_sort_order TYPE INTEGER;

-- country_sort_order
ALTER TABLE select_regions 
ALTER COLUMN country_sort_order TYPE INTEGER;

-- continent_sort_order
ALTER TABLE select_regions 
ALTER COLUMN continent_sort_order TYPE INTEGER;

-- region_name_sort_order
ALTER TABLE select_regions 
ALTER COLUMN region_name_sort_order TYPE INTEGER;

-- hotel_chains 테이블
ALTER TABLE hotel_chains
ALTER COLUMN chain_sort_order TYPE INTEGER;

-- hotel_brands 테이블
ALTER TABLE hotel_brands
ALTER COLUMN brand_sort_order TYPE INTEGER;

-- 확인
SELECT 
  table_name, 
  column_name, 
  data_type,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE column_name LIKE '%sort_order%'
  AND table_name IN ('select_regions', 'hotel_chains', 'hotel_brands')
ORDER BY table_name, column_name;

