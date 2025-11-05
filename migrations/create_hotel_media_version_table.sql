-- 호텔 이미지 버전 관리 테이블 생성
-- 이 테이블은 호텔 이미지의 캐시 버전을 관리합니다.

CREATE TABLE IF NOT EXISTS select_hotel_media_version (
  slug TEXT PRIMARY KEY,
  sabre_id TEXT NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- sabre_id로 빠른 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_select_hotel_media_version_sabre_id 
ON select_hotel_media_version(sabre_id);

-- 업데이트 시 updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_select_hotel_media_version_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_select_hotel_media_version_updated_at
  BEFORE UPDATE ON select_hotel_media_version
  FOR EACH ROW
  EXECUTE FUNCTION update_select_hotel_media_version_updated_at();

-- 테이블 설명
COMMENT ON TABLE select_hotel_media_version IS '호텔 이미지 캐시 버전 관리 테이블';
COMMENT ON COLUMN select_hotel_media_version.slug IS '호텔 slug (Primary Key)';
COMMENT ON COLUMN select_hotel_media_version.sabre_id IS '호텔 Sabre ID';
COMMENT ON COLUMN select_hotel_media_version.version IS '이미지 버전 번호 (이미지 업데이트 시 증가)';
COMMENT ON COLUMN select_hotel_media_version.created_at IS '생성 시각';
COMMENT ON COLUMN select_hotel_media_version.updated_at IS '마지막 업데이트 시각';

