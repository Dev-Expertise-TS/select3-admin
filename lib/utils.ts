import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 날짜 계산 유틸리티
export function getDateAfterDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
}

// JSON을 보기 좋게 포맷팅하는 유틸리티
export function formatJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}
