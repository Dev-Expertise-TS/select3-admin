// ============================================================================
// 폼 상태 관리 훅
// ============================================================================

import { useState, useCallback, useRef } from 'react'

interface FormState<T> {
  data: T
  errors: Partial<Record<keyof T, string>>
  isDirty: boolean
  isSubmitting: boolean
  isValid: boolean
}

interface FormActions<T> {
  setField: (field: keyof T, value: T[keyof T]) => void
  setFields: (fields: Partial<T>) => void
  setError: (field: keyof T, error: string) => void
  setErrors: (errors: Partial<Record<keyof T, string>>) => void
  clearErrors: () => void
  reset: () => void
  submit: (onSubmit: (data: T) => Promise<void>) => Promise<void>
}

export function useForm<T extends Record<string, unknown>>(
  initialData: T,
  validationRules?: Partial<Record<keyof T, (value: T[keyof T]) => string | null>>
): FormState<T> & FormActions<T> {
  const [data, setData] = useState<T>(initialData)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const initialDataRef = useRef<T>(initialData)

  const isDirty = JSON.stringify(data) !== JSON.stringify(initialDataRef.current)
  
  const isValid = Object.keys(errors).length === 0 && 
    Object.values(data).every(value => value !== null && value !== undefined && value !== '')

  const setField = useCallback((field: keyof T, value: T[keyof T]) => {
    setData(prev => ({ ...prev, [field]: value }))
    
    // 실시간 유효성 검사
    if (validationRules?.[field]) {
      const error = validationRules[field]!(value)
      setErrors(prev => ({
        ...prev,
        [field]: error || undefined
      }))
    }
  }, [validationRules])

  const setFields = useCallback((fields: Partial<T>) => {
    setData(prev => ({ ...prev, ...fields }))
    
    // 실시간 유효성 검사
    if (validationRules) {
      const newErrors: Partial<Record<keyof T, string>> = {}
      Object.entries(fields).forEach(([field, value]) => {
        const rule = validationRules[field as keyof T]
        if (rule) {
          const error = rule(value as T[keyof T])
          if (error) {
            newErrors[field as keyof T] = error
          }
        }
      })
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...newErrors }))
      }
    }
  }, [validationRules])

  const setError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }))
  }, [])

  const setErrors = useCallback((newErrors: Partial<Record<keyof T, string>>) => {
    setErrors(prev => ({ ...prev, ...newErrors }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const reset = useCallback(() => {
    setData(initialDataRef.current)
    setErrors({})
    setIsSubmitting(false)
  }, [])

  const submit = useCallback(async (onSubmit: (data: T) => Promise<void>) => {
    setIsSubmitting(true)
    clearErrors()
    
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('폼 제출 오류:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [data, clearErrors])

  return {
    data,
    errors,
    isDirty,
    isSubmitting,
    isValid,
    setField,
    setFields,
    setError,
    setErrors,
    clearErrors,
    reset,
    submit
  }
}
