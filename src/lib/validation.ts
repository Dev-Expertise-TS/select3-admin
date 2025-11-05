/**
 * 공통 검증 유틸리티
 */

export const validators = {
  required: (value: unknown): boolean => {
    if (value === null || value === undefined) return false
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    return true
  },

  email: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  },

  minLength: (value: string, min: number): boolean => {
    return value.length >= min
  },

  maxLength: (value: string, max: number): boolean => {
    return value.length <= max
  },

  pattern: (value: string, pattern: RegExp): boolean => {
    return pattern.test(value)
  },

  url: (value: string): boolean => {
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  },

  number: (value: unknown): boolean => {
    return !isNaN(Number(value))
  },

  integer: (value: unknown): boolean => {
    return Number.isInteger(Number(value))
  },

  positive: (value: number): boolean => {
    return value > 0
  },

  range: (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max
  },
}

export interface ValidationRule {
  validator: (value: any) => boolean
  message: string
}

export function validate(value: any, rules: ValidationRule[]): string | null {
  for (const rule of rules) {
    if (!rule.validator(value)) {
      return rule.message
    }
  }
  return null
}

export function validateForm<T extends Record<string, any>>(
  values: T,
  rules: Partial<Record<keyof T, ValidationRule[]>>
): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {}

  for (const key in rules) {
    const fieldRules = rules[key]
    if (fieldRules) {
      const error = validate(values[key], fieldRules)
      if (error) {
        errors[key] = error
      }
    }
  }

  return errors
}

