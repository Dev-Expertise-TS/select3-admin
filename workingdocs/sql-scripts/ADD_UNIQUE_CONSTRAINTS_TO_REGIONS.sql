-- select_regions 테이블에 유니크 제약 조건 추가
-- 각 region_type별로 해당 코드가 유니크하도록 보장

-- 기존 중복 레코드 확인 (실행 전 확인용)
-- city 타입 중복 확인
SELECT city_code, COUNT(*) as count
FROM select_regions
WHERE region_type = 'city' AND city_code IS NOT NULL
GROUP BY city_code
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- country 타입 중복 확인
SELECT country_code, COUNT(*) as count
FROM select_regions
WHERE region_type = 'country' AND country_code IS NOT NULL
GROUP BY country_code
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- continent 타입 중복 확인
SELECT continent_code, COUNT(*) as count
FROM select_regions
WHERE region_type = 'continent' AND continent_code IS NOT NULL
GROUP BY continent_code
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- region 타입 중복 확인
SELECT region_code, COUNT(*) as count
FROM select_regions
WHERE region_type = 'region' AND region_code IS NOT NULL
GROUP BY region_code
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 중복 제거 (가장 최근 레코드만 유지)
-- 주의: 실행 전 백업 권장!

-- city 타입 중복 제거
DELETE FROM select_regions
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY region_type, city_code ORDER BY id DESC) as rn
    FROM select_regions
    WHERE region_type = 'city' AND city_code IS NOT NULL
  ) t
  WHERE rn > 1
);

-- country 타입 중복 제거
DELETE FROM select_regions
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY region_type, country_code ORDER BY id DESC) as rn
    FROM select_regions
    WHERE region_type = 'country' AND country_code IS NOT NULL
  ) t
  WHERE rn > 1
);

-- continent 타입 중복 제거
DELETE FROM select_regions
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY region_type, continent_code ORDER BY id DESC) as rn
    FROM select_regions
    WHERE region_type = 'continent' AND continent_code IS NOT NULL
  ) t
  WHERE rn > 1
);

-- region 타입 중복 제거
DELETE FROM select_regions
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY region_type, region_code ORDER BY id DESC) as rn
    FROM select_regions
    WHERE region_type = 'region' AND region_code IS NOT NULL
  ) t
  WHERE rn > 1
);

-- 유니크 제약 조건 추가 (Partial Index 사용)
-- city 타입: city_code 유니크
CREATE UNIQUE INDEX IF NOT EXISTS unique_city_code 
  ON select_regions(city_code) 
  WHERE region_type = 'city' AND city_code IS NOT NULL;

-- country 타입: country_code 유니크
CREATE UNIQUE INDEX IF NOT EXISTS unique_country_code 
  ON select_regions(country_code) 
  WHERE region_type = 'country' AND country_code IS NOT NULL;

-- continent 타입: continent_code 유니크
CREATE UNIQUE INDEX IF NOT EXISTS unique_continent_code 
  ON select_regions(continent_code) 
  WHERE region_type = 'continent' AND continent_code IS NOT NULL;

-- region 타입: region_code 유니크
CREATE UNIQUE INDEX IF NOT EXISTS unique_region_code 
  ON select_regions(region_code) 
  WHERE region_type = 'region' AND region_code IS NOT NULL;

-- 검증: 중복이 제거되었는지 확인
SELECT 'city' as type, COUNT(*) as total, COUNT(DISTINCT city_code) as unique_codes
FROM select_regions WHERE region_type = 'city' AND city_code IS NOT NULL
UNION ALL
SELECT 'country' as type, COUNT(*) as total, COUNT(DISTINCT country_code) as unique_codes
FROM select_regions WHERE region_type = 'country' AND country_code IS NOT NULL
UNION ALL
SELECT 'continent' as type, COUNT(*) as total, COUNT(DISTINCT continent_code) as unique_codes
FROM select_regions WHERE region_type = 'continent' AND continent_code IS NOT NULL
UNION ALL
SELECT 'region' as type, COUNT(*) as total, COUNT(DISTINCT region_code) as unique_codes
FROM select_regions WHERE region_type = 'region' AND region_code IS NOT NULL;

-- 결과: total과 unique_codes가 같아야 함

