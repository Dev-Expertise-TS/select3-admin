-- 고객 만족도 설문 결과 테이블 생성
-- 실행 전에 Supabase SQL Editor에서 실행하세요

CREATE TABLE IF NOT EXISTS select_satisfaction_survey (
  id SERIAL PRIMARY KEY,
  submitted_at TIMESTAMP,
  booking_number TEXT,
  sabre_id INT4,
  property_name_kr TEXT,
  property_name_en TEXT,
  review_text TEXT,
  satisfaction BOOLEAN,
  early_check_in BOOLEAN,
  late_check_out BOOLEAN,
  room_upgrade BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_satisfaction_survey_sabre_id 
  ON select_satisfaction_survey(sabre_id);

CREATE INDEX IF NOT EXISTS idx_satisfaction_survey_submitted_at 
  ON select_satisfaction_survey(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_satisfaction_survey_booking_number 
  ON select_satisfaction_survey(booking_number);

-- 테이블 생성 확인
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'select_satisfaction_survey'
ORDER BY ordinal_position;

-- 샘플 데이터 삽입 (테스트용)
INSERT INTO select_satisfaction_survey (
  submitted_at,
  booking_number,
  sabre_id,
  property_name_kr,
  property_name_en,
  review_text,
  satisfaction,
  early_check_in,
  late_check_out,
  room_upgrade
) VALUES (
  NOW(),
  'BOOK20251014001',
  123456,
  '파크 하얏트 서울',
  'Park Hyatt Seoul',
  '서비스가 훌륭했습니다. 직원들이 매우 친절했고 시설도 깔끔했습니다.',
  true,
  true,
  true,
  false
), (
  NOW() - INTERVAL '1 day',
  'BOOK20251013002',
  789012,
  '그랜드 하얏트 서울',
  'Grand Hyatt Seoul',
  '체크인 과정이 빠르고 편리했습니다.',
  true,
  false,
  false,
  true
);

-- 데이터 확인
SELECT 
  id,
  submitted_at,
  booking_number,
  sabre_id,
  property_name_kr,
  property_name_en,
  satisfaction,
  early_check_in,
  late_check_out,
  room_upgrade,
  created_at
FROM select_satisfaction_survey
ORDER BY submitted_at DESC;
