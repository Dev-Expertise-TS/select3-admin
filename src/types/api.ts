// ============================================================================
// 공통 API 타입 정의
// ============================================================================

/**
 * 표준 API 응답 타입
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
  details?: Record<string, unknown>
  meta?: {
    count?: number
    page?: number
    pageSize?: number
    totalPages?: number
  }
}

/**
 * 성공 응답 생성 헬퍼
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: ApiResponse<T>['meta']
): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta })
  }
}

/**
 * 에러 응답 생성 헬퍼
 */
export function createErrorResponse(
  error: string,
  code?: string,
  details?: Record<string, unknown>
): ApiResponse {
  return {
    success: false,
    error,
    ...(code && { code }),
    ...(details && { details })
  }
}

/**
 * 페이지네이션 메타데이터 타입
 */
export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/**
 * 페이지네이션된 응답 타입
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta
}

/**
 * 폼 데이터 타입
 */
export interface FormData {
  [key: string]: string | string[] | File | null
}

/**
 * API 에러 코드 상수
 */
export const API_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  SUPPLIER_TIMEOUT: 'SUPPLIER_TIMEOUT',
  VENDOR_ERROR: 'VENDOR_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES]
