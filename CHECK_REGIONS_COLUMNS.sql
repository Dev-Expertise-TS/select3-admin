-- select_regions 테이블의 모든 컬럼 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'select_regions' 
ORDER BY ordinal_position;

-- 특히 중요한 컬럼들 확인
-- status, region_name_ko, region_name_en, region_code 등

-- 샘플 데이터 확인 (city 타입)
SELECT 
  id,
  region_type,
  status,
  city_ko,
  city_en,
  city_code,
  country_ko,
  country_code,
  continent_ko,
  continent_code,
  region_name_ko,
  region_code
FROM select_regions 
WHERE region_type = 'city'
LIMIT 5;

-- 신규 city 레코드 수동 생성 테스트
-- INSERT INTO select_regions (
--   region_type, status, city_ko, city_en, city_code
-- ) VALUES (
--   'city', 'active', '테스트도시', 'Test City', 'TST'
-- );

-- 방금 생성된 레코드 확인
-- SELECT * FROM select_regions WHERE city_ko = '테스트도시';

