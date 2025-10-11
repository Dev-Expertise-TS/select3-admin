-- select_city_media 테이블 생성
-- 도시 이미지 메타데이터를 저장하는 테이블

CREATE TABLE IF NOT EXISTS select_city_media (
  id BIGSERIAL PRIMARY KEY,
  city_code VARCHAR,
  city_ko VARCHAR,
  city_en VARCHAR,
  city_slug VARCHAR,
  file_name VARCHAR NOT NULL,
  file_path VARCHAR NOT NULL,
  storage_path VARCHAR NOT NULL,
  public_url TEXT NOT NULL,
  file_type VARCHAR,
  file_size BIGINT,
  image_seq INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_select_city_media_city_code 
  ON select_city_media(city_code);

CREATE INDEX IF NOT EXISTS idx_select_city_media_city_slug 
  ON select_city_media(city_slug);

CREATE INDEX IF NOT EXISTS idx_select_city_media_city_ko 
  ON select_city_media(city_ko);

CREATE INDEX IF NOT EXISTS idx_select_city_media_created_at 
  ON select_city_media(created_at DESC);

-- 코멘트 추가
COMMENT ON TABLE select_city_media IS '도시 이미지 메타데이터 테이블';
COMMENT ON COLUMN select_city_media.id IS '고유 ID (자동 증가)';
COMMENT ON COLUMN select_city_media.city_code IS '도시 코드';
COMMENT ON COLUMN select_city_media.city_ko IS '도시명 (한글)';
COMMENT ON COLUMN select_city_media.city_en IS '도시명 (영문)';
COMMENT ON COLUMN select_city_media.city_slug IS '도시 slug';
COMMENT ON COLUMN select_city_media.file_name IS '파일명';
COMMENT ON COLUMN select_city_media.file_path IS '파일 경로';
COMMENT ON COLUMN select_city_media.storage_path IS 'Storage 경로';
COMMENT ON COLUMN select_city_media.public_url IS '공개 URL';
COMMENT ON COLUMN select_city_media.file_type IS '파일 타입 (MIME type)';
COMMENT ON COLUMN select_city_media.file_size IS '파일 크기 (bytes)';
COMMENT ON COLUMN select_city_media.image_seq IS '이미지 순서';

