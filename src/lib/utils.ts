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
