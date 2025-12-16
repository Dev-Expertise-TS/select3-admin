/**
 * Rate Plan Codes 상수 정의
 * 
 * select_hotels 테이블의 rate_plan_code 컬럼은 TEXT 타입이며,
 * 콤마로 구분된 문자열 형태로 저장됩니다. (예: "API,ZP3,VMC")
 * 
 * 새로운 rate code를 추가하려면 이 파일의 RATE_PLAN_CODES 배열만 수정하면 됩니다.
 */

/**
 * 허용된 Rate Plan Code 목록
 * 
 * 이 목록은 다음 용도로 사용됩니다:
 * - API 응답 (/api/rate-plan-codes)
 * - 입력 검증 (rate-plan-validator.ts)
 * - UI 선택 옵션
 */
export const RATE_PLAN_CODES = [
  'API', 'ZP3', 'VMC', 'TLC', 'H01', 'S72', 'XLO', 'PPR', 
  'FAN', 'WMP', 'HPM', 'TID', 'STP', 'BAR', 'RAC', 'PKG',
  'V8M', 'W9E', 'CDH', 'A72', 'L72', 'XMH', 'PUF'
] as const

/**
 * Rate Plan Code 타입 (TypeScript 타입 안전성)
 */
export type RatePlanCode = typeof RATE_PLAN_CODES[number]

/**
 * Rate Plan Code 검증
 */
export function isValidRatePlanCode(code: string): code is RatePlanCode {
  return RATE_PLAN_CODES.includes(code as RatePlanCode)
}

