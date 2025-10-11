-- select_hotel_media 테이블 생성
-- 호텔 이미지 메타데이터를 저장하는 테이블

CREATE TABLE IF NOT EXISTS select_hotel_media (
  id BIGSERIAL PRIMARY KEY,
  sabre_id VARCHAR NOT NULL,
  file_name VARCHAR NOT NULL,
  file_path VARCHAR NOT NULL,
  storage_path VARCHAR NOT NULL,
  public_url TEXT NOT NULL,
  file_type VARCHAR,
  file_size BIGINT,
  slug VARCHAR,
  image_seq INTEGER,
  original_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 외래키 제약 (선택사항)
  CONSTRAINT fk_select_hotel_media_sabre_id 
    FOREIGN KEY (sabre_id) 
    REFERENCES select_hotels(sabre_id) 
    ON DELETE CASCADE
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_select_hotel_media_sabre_id 
  ON select_hotel_media(sabre_id);

CREATE INDEX IF NOT EXISTS idx_select_hotel_media_slug 
  ON select_hotel_media(slug);

CREATE INDEX IF NOT EXISTS idx_select_hotel_media_created_at 
  ON select_hotel_media(created_at DESC);

-- 코멘트 추가
COMMENT ON TABLE select_hotel_media IS '호텔 이미지 메타데이터 테이블';
COMMENT ON COLUMN select_hotel_media.id IS '고유 ID (자동 증가)';
COMMENT ON COLUMN select_hotel_media.sabre_id IS '호텔 Sabre ID (외래키)';
COMMENT ON COLUMN select_hotel_media.file_name IS '파일명';
COMMENT ON COLUMN select_hotel_media.file_path IS '파일 경로';
COMMENT ON COLUMN select_hotel_media.storage_path IS 'Storage 경로';
COMMENT ON COLUMN select_hotel_media.public_url IS '공개 URL';
COMMENT ON COLUMN select_hotel_media.file_type IS '파일 타입 (MIME type)';
COMMENT ON COLUMN select_hotel_media.file_size IS '파일 크기 (bytes)';
COMMENT ON COLUMN select_hotel_media.slug IS '호텔 slug';
COMMENT ON COLUMN select_hotel_media.image_seq IS '이미지 순서 (마이그레이션용)';
COMMENT ON COLUMN select_hotel_media.original_url IS '원본 URL (마이그레이션용)';
COMMENT ON COLUMN select_hotel_media.created_at IS '생성 시간';
COMMENT ON COLUMN select_hotel_media.updated_at IS '수정 시간';
