'use client'

import { useState, useCallback } from 'react'

interface UseDisclosureReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export function useDisclosure(initialState = false): UseDisclosureReturn {
  const [isOpen, setIsOpen] = useState(initialState)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return {
    isOpen,
    open,
    close,
    toggle,
  }
}

// 여러 상태를 관리하는 버전
export function useMultipleDisclosure<T extends string>(
  keys: T[],
  initialStates?: Partial<Record<T, boolean>>
) {
  const [states, setStates] = useState<Record<T, boolean>>(() => {
    const initial = {} as Record<T, boolean>
    keys.forEach((key) => {
      initial[key] = initialStates?.[key] ?? false
    })
    return initial
  })

  const open = useCallback((key: T) => {
    setStates((prev) => ({ ...prev, [key]: true }))
  }, [])

  const close = useCallback((key: T) => {
    setStates((prev) => ({ ...prev, [key]: false }))
  }, [])

  const toggle = useCallback((key: T) => {
    setStates((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const closeAll = useCallback(() => {
    setStates((prev) => {
      const newStates = { ...prev }
      keys.forEach((key) => {
        newStates[key] = false
      })
      return newStates
    })
  }, [keys])

  return {
    states,
    open,
    close,
    toggle,
    closeAll,
  }
}

