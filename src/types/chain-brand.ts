// ============================================================================
// 체인/브랜드 관련 타입 정의
// ============================================================================

import type { ApiResponse } from './api'

/**
 * 호텔 체인 타입
 */
export interface Chain {
  chain_id: number
  name_kr: string | null
  name_en: string | null
  slug: string | null
  created_at?: string
  updated_at?: string
}

/**
 * 호텔 브랜드 타입
 */
export interface Brand {
  brand_id: number
  name_kr: string | null
  name_en: string | null
  chain_id: number | null
  created_at?: string
  updated_at?: string
}

/**
 * 체인 목록 API 응답 타입
 */
export type ChainsApiResponse = ApiResponse<Chain[]>

/**
 * 브랜드 목록 API 응답 타입
 */
export type BrandsApiResponse = ApiResponse<Brand[]>

/**
 * 체인/브랜드 목록 API 응답 타입
 */
export type ChainBrandListApiResponse = ApiResponse<{
  chains: Chain[]
  brands: Brand[]
}>

/**
 * 체인 생성/수정 요청 타입
 */
export interface ChainRequest {
  name_kr?: string
  name_en?: string
  slug?: string
}

/**
 * 브랜드 생성/수정 요청 타입
 */
export interface BrandRequest {
  name_kr?: string
  name_en?: string
  chain_id?: number
}

/**
 * 체인/브랜드 선택 이벤트 타입
 */
export interface ChainBrandSelectEvent {
  chain: Chain | null
  brand: Brand | null
}
