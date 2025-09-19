// ============================================================================
// API 유틸리티 함수
// ============================================================================

import { NextResponse } from 'next/server'
import type { ApiResponse, ApiErrorCode } from '@/types/api'
import { API_ERROR_CODES } from '@/types/api'

/**
 * 표준화된 성공 응답 생성
 */
export function createApiSuccessResponse<T>(
  data: T,
  status: number = 200,
  meta?: ApiResponse<T>['meta']
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta && { meta })
    },
    { status }
  )
}

/**
 * 표준화된 에러 응답 생성
 */
export function createApiErrorResponse(
  error: string,
  status: number = 500,
  code?: ApiErrorCode,
  details?: Record<string, unknown>
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(code && { code }),
      ...(details && { details })
    },
    { status }
  )
}

/**
 * Supabase 에러를 사용자 친화적 메시지로 변환
 */
export function transformSupabaseError(error: unknown): {
  message: string
  code?: ApiErrorCode
  status: number
} {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const supabaseError = error as { code: string; message: string; details?: string }
    
    switch (supabaseError.code) {
      case 'PGRST116':
        return {
          message: '요청한 데이터를 찾을 수 없습니다.',
          code: API_ERROR_CODES.NOT_FOUND,
          status: 404
        }
      case '23505': // unique_violation
        return {
          message: '이미 존재하는 데이터입니다.',
          code: API_ERROR_CODES.CONFLICT,
          status: 409
        }
      case '23503': // foreign_key_violation
        return {
          message: '관련된 데이터가 존재하지 않습니다.',
          code: API_ERROR_CODES.VALIDATION_ERROR,
          status: 422
        }
      case '22P02': // invalid_text_representation
        return {
          message: '잘못된 데이터 형식입니다.',
          code: API_ERROR_CODES.VALIDATION_ERROR,
          status: 400
        }
      default:
        return {
          message: supabaseError.message || '데이터베이스 오류가 발생했습니다.',
          code: API_ERROR_CODES.INTERNAL_ERROR,
          status: 500
        }
    }
  }

  if (error instanceof Error) {
    // 타임아웃 에러 처리
    if (error.message.includes('timeout')) {
      return {
        message: '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
        code: API_ERROR_CODES.SUPPLIER_TIMEOUT,
        status: 408
      }
    }

    // 벤더 에러 처리
    if (error.message.includes('Vendor response error')) {
      return {
        message: '외부 서비스에서 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        code: API_ERROR_CODES.VENDOR_ERROR,
        status: 503
      }
    }

    return {
      message: error.message,
      code: API_ERROR_CODES.INTERNAL_ERROR,
      status: 500
    }
  }

  return {
    message: '알 수 없는 오류가 발생했습니다.',
    code: API_ERROR_CODES.INTERNAL_ERROR,
    status: 500
  }
}

/**
 * API 핸들러 래퍼 - 에러 핸들링을 자동화
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse<ApiResponse>>
) {
  return async (...args: T): Promise<NextResponse<ApiResponse>> => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error('API 핸들러 오류:', error)
      
      const { message, code, status } = transformSupabaseError(error)
      
      return createApiErrorResponse(message, status, code)
    }
  }
}

/**
 * 폼 데이터 파싱 헬퍼
 */
export function parseFormData(formData: FormData): Record<string, string | string[] | null> {
  const result: Record<string, string | string[] | null> = {}
  
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      result[key] = value === '' ? null : value
    } else if (value instanceof File) {
      // 파일은 문자열로 변환하지 않음
      continue
    }
  }
  
  return result
}

/**
 * 페이지네이션 메타데이터 생성
 */
export function createPaginationMeta(
  page: number,
  pageSize: number,
  total: number
): ApiResponse['meta'] {
  return {
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}

/**
 * 빈 문자열을 null로 변환
 */
export function normalizeEmptyString(value: string | null | undefined): string | null {
  return value === '' ? null : value || null
}

/**
 * 빈 배열을 null로 변환
 */
export function normalizeEmptyArray<T>(value: T[] | null | undefined): T[] | null {
  return Array.isArray(value) && value.length === 0 ? null : value || null
}
