-- =====================================================
-- select_regions 테이블에 unique 제약 조건 추가
-- =====================================================
-- 목적: region_type별로 code가 중복되지 않도록 보장
-- 실행 전: 중복 데이터 확인 및 정리 필요
-- =====================================================

-- Step 1: 중복 데이터 확인
SELECT 
  region_type,
  city_code,
  COUNT(*) as count
FROM select_regions
WHERE region_type = 'city' AND city_code IS NOT NULL
GROUP BY region_type, city_code
HAVING COUNT(*) > 1
ORDER BY count DESC;

SELECT 
  region_type,
  country_code,
  COUNT(*) as count
FROM select_regions
WHERE region_type = 'country' AND country_code IS NOT NULL
GROUP BY region_type, country_code
HAVING COUNT(*) > 1
ORDER BY count DESC;

SELECT 
  region_type,
  continent_code,
  COUNT(*) as count
FROM select_regions
WHERE region_type = 'continent' AND continent_code IS NOT NULL
GROUP BY region_type, continent_code
HAVING COUNT(*) > 1
ORDER BY count DESC;

SELECT 
  region_type,
  region_code,
  COUNT(*) as count
FROM select_regions
WHERE region_type = 'region' AND region_code IS NOT NULL
GROUP BY region_type, region_code
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Step 2: 중복 데이터 삭제 (최신 레코드만 남기고 나머지 삭제)
-- City 중복 제거
WITH duplicates AS (
  SELECT 
    id,
    city_code,
    ROW_NUMBER() OVER (PARTITION BY region_type, city_code ORDER BY id DESC) as rn
  FROM select_regions
  WHERE region_type = 'city' AND city_code IS NOT NULL
)
DELETE FROM select_regions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Country 중복 제거
WITH duplicates AS (
  SELECT 
    id,
    country_code,
    ROW_NUMBER() OVER (PARTITION BY region_type, country_code ORDER BY id DESC) as rn
  FROM select_regions
  WHERE region_type = 'country' AND country_code IS NOT NULL
)
DELETE FROM select_regions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Continent 중복 제거
WITH duplicates AS (
  SELECT 
    id,
    continent_code,
    ROW_NUMBER() OVER (PARTITION BY region_type, continent_code ORDER BY id DESC) as rn
  FROM select_regions
  WHERE region_type = 'continent' AND continent_code IS NOT NULL
)
DELETE FROM select_regions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Region 중복 제거
WITH duplicates AS (
  SELECT 
    id,
    region_code,
    ROW_NUMBER() OVER (PARTITION BY region_type, region_code ORDER BY id DESC) as rn
  FROM select_regions
  WHERE region_type = 'region' AND region_code IS NOT NULL
)
DELETE FROM select_regions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 3: Unique 인덱스 생성
-- City code unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_regions_city_code_unique
ON select_regions (city_code)
WHERE region_type = 'city' AND city_code IS NOT NULL;

-- Country code unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_regions_country_code_unique
ON select_regions (country_code)
WHERE region_type = 'country' AND country_code IS NOT NULL;

-- Continent code unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_regions_continent_code_unique
ON select_regions (continent_code)
WHERE region_type = 'continent' AND continent_code IS NOT NULL;

-- Region code unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_regions_region_code_unique
ON select_regions (region_code)
WHERE region_type = 'region' AND region_code IS NOT NULL;

-- Step 4: 결과 확인
SELECT 
  'city' as type,
  COUNT(*) as total_count,
  COUNT(DISTINCT city_code) as unique_codes
FROM select_regions
WHERE region_type = 'city'
UNION ALL
SELECT 
  'country' as type,
  COUNT(*) as total_count,
  COUNT(DISTINCT country_code) as unique_codes
FROM select_regions
WHERE region_type = 'country'
UNION ALL
SELECT 
  'continent' as type,
  COUNT(*) as total_count,
  COUNT(DISTINCT continent_code) as unique_codes
FROM select_regions
WHERE region_type = 'continent'
UNION ALL
SELECT 
  'region' as type,
  COUNT(*) as total_count,
  COUNT(DISTINCT region_code) as unique_codes
FROM select_regions
WHERE region_type = 'region';

-- =====================================================
-- 실행 완료 후 확인 사항
-- =====================================================
-- 1. 각 타입별 total_count = unique_codes 확인
-- 2. 중복 데이터가 모두 제거되었는지 확인
-- 3. 애플리케이션에서 저장 테스트
-- =====================================================
