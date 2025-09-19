// ============================================================================
// 혜택 관련 타입 정의
// ============================================================================

import type { ApiResponse } from './api'

/**
 * 혜택 행 데이터 타입
 */
export interface BenefitRow {
  benefit_id: string | number
  benefit: string | null
  benefit_description: string | null
  start_date: string | null
  end_date: string | null
}

/**
 * 혜택 매핑 행 타입
 */
export interface BenefitMapRow {
  benefit_id: string
  sort: number | null
}

/**
 * 혜택 목록 API 응답 타입
 */
export type BenefitsListApiResponse = ApiResponse<BenefitRow[]>

/**
 * 혜택 매핑 저장 요청 타입
 */
export interface BenefitMappingRequest {
  originalSabreId: string | null
  targetSabreId: string
  mappedIds: string[]
  sortMap: Map<string, number>
}

/**
 * 혜택 관리 폼 데이터 타입
 */
export interface BenefitFormData {
  pkField: string
  pkValue: string
  [key: string]: string | null
}
