// ============================================================================
// 호텔 관련 타입 정의
// ============================================================================

import type { ApiResponse } from './api'

// 호텔 검색 요청 타입
export interface SearchHotelRequest {
  searching_string: string
  limit?: number
}

// 호텔 검색 결과 타입
export interface HotelSearchResult {
  sabre_id: string | null
  paragon_id: string | null
  property_name_ko: string | null
  property_name_en: string | null
  rate_plan_code: string[] | null
  created_at: string | null
  chain_name_kr: string | null
  brand_name_kr: string | null
}

// 호텔 업데이트 요청 타입
export interface HotelUpdateRequest {
  sabre_id: string
  property_name_ko?: string
  property_name_en?: string
  chain_id?: string
  brand_id?: string
  rate_plan_code?: string[]
  property_details?: string
}

// 호텔 검색 API 응답 타입
export type HotelSearchApiResponse = ApiResponse<HotelSearchResult[]>

// Rate Plan Code API 응답 타입
export type RatePlanCodesApiResponse = ApiResponse<string[]>

// ============================================================================
// Sabre API 관련 타입
// ============================================================================

// Sabre API 호출 요청 타입
export interface HotelDetailsRequest {
  RatePlanCode?: string[]
  ExactMatchOnly?: boolean
  HotelCode: string
  CurrencyCode: string
  StartDate: string
  EndDate: string
  Adults: number
}

// ============================================================================
// UI 상태 타입
// ============================================================================

// 확장 패널 상태 타입
export interface ExpandedRowState {
  type: 'hotel-details' | 'image-management'
  hotelId: string
  hotel?: HotelSearchResult
  currencyCode: string
  adults: number
  startDate: string
  endDate: string
  selectedRatePlanCodes: string[]
  originalRatePlanCodes: string[]
  isLoading: boolean
  isSaving: boolean
  testResult: unknown
  error: string | null
  saveSuccess: boolean
}