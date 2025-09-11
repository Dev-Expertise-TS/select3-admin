/**
 * TypeScript 타입 가드 함수들
 * 런타임에서 타입을 안전하게 검증하고 좁히기 위한 유틸리티
 */

/**
 * Supabase 에러 타입 가드
 */
export function isSupabaseError(error: unknown): error is { 
  code?: string
  message?: string
  details?: string
  hint?: string
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'message' in error || 'details' in error || 'hint' in error)
  )
}

/**
 * PostgrestError 타입 가드
 */
export function isPostgrestError(error: unknown): error is {
  code: string
  message: string
  details?: string
  hint?: string
} {
  return (
    isSupabaseError(error) &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  )
}

/**
 * 네트워크 에러 타입 가드
 */
export function isNetworkError(error: unknown): error is {
  name: string
  message: string
  cause?: unknown
} {
  return (
    error instanceof Error &&
    (error.name === 'TypeError' || error.name === 'NetworkError') &&
    (error.message.includes('fetch') || error.message.includes('network'))
  )
}

/**
 * 타임아웃 에러 타입 가드
 */
export function isTimeoutError(error: unknown): error is {
  name: string
  message: string
} {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || error.message.includes('timeout'))
  )
}

/**
 * JSON 파싱 에러 타입 가드
 */
export function isJsonParseError(error: unknown): error is SyntaxError {
  return error instanceof SyntaxError
}

/**
 * 문자열 배열 타입 가드
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

/**
 * 숫자 배열 타입 가드
 */
export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(item => typeof item === 'number')
}

/**
 * 객체 타입 가드
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 문자열 타입 가드 (빈 문자열도 허용)
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * 비어있지 않은 문자열 타입 가드
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * 숫자 타입 가드
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * 양수 타입 가드
 */
export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0
}

/**
 * URL 문자열 타입 가드
 */
export function isUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/**
 * 이메일 문자열 타입 가드
 */
export function isEmail(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

/**
 * 날짜 문자열 타입 가드 (ISO 8601 형식)
 */
export function isISODateString(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false
  const date = new Date(value)
  return !isNaN(date.getTime()) && date.toISOString() === value
}

/**
 * UUID 문자열 타입 가드
 */
export function isUUID(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}
