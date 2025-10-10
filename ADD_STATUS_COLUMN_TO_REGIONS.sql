-- select_regions 테이블에 status 컬럼 추가
-- 기본값은 'active'로 설정

ALTER TABLE select_regions 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'inactive'));

-- 기존 레코드에 대한 기본값 설정 (이미 NOT NULL DEFAULT로 처리됨)
-- 필요시 특정 조건으로 업데이트
-- UPDATE select_regions SET status = 'active' WHERE status IS NULL;

-- 인덱스 추가 (필터링 성능 향상을 위해)
CREATE INDEX IF NOT EXISTS idx_select_regions_status ON select_regions(status);
CREATE INDEX IF NOT EXISTS idx_select_regions_type_status ON select_regions(region_type, status);

-- 확인 쿼리
-- SELECT id, region_type, status, city_ko, city_en FROM select_regions LIMIT 10;

