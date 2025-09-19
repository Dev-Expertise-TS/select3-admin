import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Tailwind CSS 클래스명을 병합하고 충돌을 해결하는 유틸리티
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 현재 날짜로부터 지정된 일수 후의 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getDateAfterDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

/**
 * 객체를 보기 좋게 포맷팅된 JSON 문자열로 변환
 */
export function formatJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2)
}

/**
 * 안전한 날짜 생성 - 유효한 입력만 허용
 */
export function safeDate(value: string | number | Date): Date | null {
  if (!value) return null
  
  try {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

/**
 * 문자열을 안전하게 숫자로 변환
 */
export function safeNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  
  const num = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(num) ? null : num
}

/**
 * 문자열을 안전하게 정수로 변환
 */
export function safeInteger(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  
  const num = typeof value === 'string' ? parseInt(value, 10) : Math.floor(value)
  return isNaN(num) ? null : num
}

/**
 * 깊은 객체 접근을 위한 안전한 헬퍼
 */
export function deepGet<T>(obj: unknown, path: string, defaultValue?: T): T | undefined {
  if (!obj || typeof obj !== 'object') return defaultValue
  
  const keys = path.split('.')
  let current: unknown = obj
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue
    }
    current = (current as Record<string, unknown>)[key]
  }
  
  return current as T | undefined
}

/**
 * 배열을 안전하게 문자열로 변환 (콤마 구분)
 */
export function arrayToString(arr: string[] | null | undefined): string {
  if (!Array.isArray(arr) || arr.length === 0) return ''
  return arr.filter(Boolean).join(', ')
}

/**
 * 문자열을 안전하게 배열로 변환 (콤마 구분)
 */
export function stringToArray(str: string | null | undefined): string[] {
  if (!str || typeof str !== 'string') return []
  return str.split(',').map(s => s.trim()).filter(Boolean)
}

/**
 * 디바운스 함수
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * 스로틀 함수
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 객체의 키를 카멜케이스로 변환
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * 객체의 키를 스네이크케이스로 변환
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * 객체의 모든 키를 카멜케이스로 변환
 */
export function keysToCamelCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    result[toCamelCase(key)] = value
  }
  
  return result
}

/**
 * 객체의 모든 키를 스네이크케이스로 변환
 */
export function keysToSnakeCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    result[toSnakeCase(key)] = value
  }
  
  return result
}
