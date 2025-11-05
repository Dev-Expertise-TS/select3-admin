'use client'

import { useState, useCallback } from 'react'

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface UseApiOptions {
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}

export function useApi<T = any>(options?: UseApiOptions) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(
    async (apiCall: () => Promise<T>) => {
      setState({ data: null, loading: true, error: null })
      
      try {
        const result = await apiCall()
        setState({ data: result, loading: false, error: null })
        options?.onSuccess?.(result)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
        setState({ data: null, loading: false, error: errorMessage })
        options?.onError?.(errorMessage)
        throw err
      }
    },
    [options]
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    execute,
    reset,
  }
}

// Fetch 래퍼
export function useFetch<T = any>(url: string, options?: RequestInit & UseApiOptions) {
  const api = useApi<T>(options)

  const fetch = useCallback(
    async (customOptions?: RequestInit) => {
      return api.execute(async () => {
        const response = await window.fetch(url, {
          ...options,
          ...customOptions,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        
        // 표준 API 응답 형식 처리
        if (data.success === false) {
          throw new Error(data.error || '요청이 실패했습니다.')
        }

        return data.success ? data.data : data
      })
    },
    [url, options, api]
  )

  return {
    ...api,
    fetch,
  }
}

// Mutation (POST/PUT/PATCH/DELETE)
export function useMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseApiOptions
) {
  const api = useApi<TData>(options)

  const mutate = useCallback(
    async (variables: TVariables) => {
      return api.execute(() => mutationFn(variables))
    },
    [mutationFn, api]
  )

  return {
    ...api,
    mutate,
  }
}

