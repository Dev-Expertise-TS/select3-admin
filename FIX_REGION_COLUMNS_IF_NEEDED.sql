-- select_regions 테이블에 region 관련 컬럼이 없다면 추가
-- 이미 있다면 에러가 발생하지 않고 스킵됨

-- region_name_ko, region_name_en, region_code 컬럼 추가 (이미 있을 가능성 높음)
ALTER TABLE select_regions 
ADD COLUMN IF NOT EXISTS region_name_ko VARCHAR(255),
ADD COLUMN IF NOT EXISTS region_name_en VARCHAR(255),
ADD COLUMN IF NOT EXISTS region_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS region_slug VARCHAR(255),
ADD COLUMN IF NOT EXISTS region_name_sort_order INTEGER;

-- 만약 컬럼명이 region_ko, region_en으로 되어 있다면 rename 필요
-- (아래는 필요한 경우에만 실행)
-- ALTER TABLE select_regions RENAME COLUMN region_ko TO region_name_ko;
-- ALTER TABLE select_regions RENAME COLUMN region_en TO region_name_en;

-- 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'select_regions' 
  AND column_name LIKE '%region%'
ORDER BY column_name;

