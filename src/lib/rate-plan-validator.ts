/**
 * Rate Plan 코드 검증 및 정규화 유틸리티
 * Supabase enum 타입과 호환되는 Rate Plan 코드를 처리
 */

import { createServiceRoleClient } from '@/lib/supabase/server'

// 기본 허용 Rate Plan 코드 (enum 조회 실패 시 폴백)
const FALLBACK_RATE_PLAN_CODES = [
  'API', 'ZP3', 'VMC', 'TLC', 'H01', 'S72', 'XLO', 'PPR', 'FAN', 'WMP', 'HPM', 'TID', 'STP'
]

export interface RatePlanValidationResult {
  allowedCodes: string[]
  cleanedCodes: string[]
  normalizedCodes: string | null
  isValid: boolean
  errors: string[]
}

/**
 * Supabase에서 Rate Plan 코드 enum 값들을 조회
 * @returns 허용된 Rate Plan 코드 배열
 */
export async function getAllowedRatePlanCodes(): Promise<string[]> {
  try {
    const supabase = createServiceRoleClient()
    
    // pg_type에서 rate_plan_code enum의 oid 조회
    const { data: typeData } = await supabase
      .from('pg_type')
      .select('oid')
      .eq('typname', 'rate_plan_code')
      .single()
    
    if (!typeData?.oid) {
      return FALLBACK_RATE_PLAN_CODES
    }
    
    // pg_enum에서 enum 값들 조회
    const { data: enumData } = await supabase
      .from('pg_enum')
      .select('enumlabel')
      .eq('enumtypid', typeData.oid)
      .order('enumsortorder', { ascending: true })
    
    const enumValues = (enumData?.map((r: { enumlabel: string }) => r.enumlabel) || [])
      .filter(Boolean)
    
    return enumValues.length > 0 ? enumValues : FALLBACK_RATE_PLAN_CODES
  } catch (error) {
    console.warn('Rate Plan 코드 enum 조회 실패, 폴백 값 사용:', error)
    return FALLBACK_RATE_PLAN_CODES
  }
}

/**
 * Rate Plan 코드 배열을 검증하고 정규화
 * @param inputCodes - 입력된 Rate Plan 코드 배열
 * @param allowedCodes - 허용된 Rate Plan 코드 배열
 * @returns 검증 및 정규화 결과
 */
export function validateAndNormalizeRatePlanCodes(
  inputCodes: unknown[],
  allowedCodes: string[]
): RatePlanValidationResult {
  const errors: string[] = []
  
  // 입력 검증
  if (!Array.isArray(inputCodes)) {
    errors.push('rate_plan_code must be an array')
    return {
      allowedCodes,
      cleanedCodes: [],
      normalizedCodes: null,
      isValid: false,
      errors
    }
  }
  
  // 코드 정규화: 공백 제거, 대문자 변환, 빈 값 제거, 잘못된 형식 필터링
  const cleanedCodes = inputCodes
    .map((code) => {
      if (typeof code !== 'string') {
        errors.push(`Invalid code type: ${typeof code}`)
        return ''
      }
      
      let cleanCode = code.trim().toUpperCase()
      
      // JSON 파싱 오류를 일으키는 문자열 패턴 제거
      // 예: '["API"', '"ZP3"', '"VMC"', '"TLC"]'
      if (cleanCode.includes('[') || cleanCode.includes(']') || cleanCode.includes('"')) {
        // JSON 배열 부분 문자열에서 실제 코드만 추출
        cleanCode = cleanCode.replace(/[\[\]"]/g, '').trim()
      }
      
      return cleanCode
    })
    .filter((code) => {
      if (code.length === 0) return false
      
      // 허용된 코드 목록에 있는지 확인
      if (!allowedCodes.includes(code)) {
        errors.push(`Invalid rate plan code: ${code}`)
        return false
      }
      return true
    })
    // 중복 제거
    .filter((code, index, array) => array.indexOf(code) === index)
  
  // 배열을 쉼표로 구분된 문자열로 변환 (빈 배열이면 null)
  const normalizedCodes = cleanedCodes.length > 0 ? cleanedCodes.join(',') : null
  
  return {
    allowedCodes,
    cleanedCodes,
    normalizedCodes,
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 잘못된 enum 코드를 제거하고 재시도용 코드 생성
 * @param currentCodes - 현재 코드 문자열
 * @param badCode - 제거할 잘못된 코드
 * @param allowedCodes - 허용된 코드 배열
 * @returns 정리된 코드 문자열 또는 null
 */
export function removeInvalidCode(
  currentCodes: string | null,
  badCode: string,
  allowedCodes: string[]
): string | null {
  if (!currentCodes) return null
  
  const codesArray = currentCodes
    .split(',')
    .filter((code) => code.trim() !== badCode && allowedCodes.includes(code.trim()))
  
  return codesArray.length > 0 ? codesArray.join(',') : null
}

/**
 * 단일 enum 값으로 저장 시도 (일부 스키마에서 enum 단일 컬럼일 수 있음)
 * @param codes - 코드 문자열
 * @returns 첫 번째 코드 또는 null
 */
export function getFirstValidCode(codes: string | null): string | null {
  if (!codes) return null
  const firstCode = codes.split(',')[0]
  return firstCode || null
}
