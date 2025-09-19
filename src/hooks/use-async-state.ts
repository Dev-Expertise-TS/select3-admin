// ============================================================================
// 비동기 상태 관리 훅
// ============================================================================

import { useState, useCallback } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface AsyncActions<T> {
  execute: (asyncFn: () => Promise<T>) => Promise<T | null>
  setData: (data: T | null) => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export function useAsyncState<T = unknown>(
  initialData: T | null = null
): AsyncState<T> & AsyncActions<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null
  })

  const execute = useCallback(async (asyncFn: () => Promise<T>): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const result = await asyncFn()
      setState({ data: result, loading: false, error: null })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      return null
    }
  }, [])

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }))
  }, [])

  const reset = useCallback(() => {
    setState({ data: initialData, loading: false, error: null })
  }, [initialData])

  return {
    ...state,
    execute,
    setData,
    setError,
    setLoading,
    reset
  }
}
