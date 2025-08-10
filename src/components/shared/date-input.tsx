'use client'

import React, { useId, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'

export interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name?: string
  placeholderText?: string
}

export function DateInput({ name, value, defaultValue, className, placeholderText = '날짜 선택', onClick, onChange, ...rest }: DateInputProps) {
  const id = useId()
  const ref = useRef<HTMLInputElement>(null)

  const hasValue = useMemo(() => {
    const v = value ?? defaultValue
    if (v == null) return false
    if (typeof v === 'string') return v.length > 0
    return true
  }, [value, defaultValue])

  const openPicker = () => {
    try {
      ref.current?.showPicker?.()
    } catch {}
    ref.current?.focus()
  }

  return (
    <div className="relative w-full">
      {!hasValue && (
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">{placeholderText}</span>
      )}
      <input
        ref={ref}
        id={id}
        type="date"
        name={name}
        value={value as string | undefined}
        defaultValue={value == null ? (typeof defaultValue === 'string' ? defaultValue : undefined) : undefined}
        placeholder=""
        onClick={(e) => {
          openPicker()
          onClick?.(e)
        }}
        onChange={(e) => {
          onChange?.(e)
        }}
        className={cn(
          'date-input--custom w-full appearance-none rounded border px-2 py-1 pr-8 text-sm',
          !hasValue && 'text-transparent caret-transparent selection:bg-transparent',
          className
        )}
        {...rest}
      />
      <button
        type="button"
        aria-label="open date picker"
        onClick={openPicker}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
      >
        📅
      </button>
      <style jsx global>{`
        input.date-input--custom::-webkit-calendar-picker-indicator { display: none; }
        input.date-input--custom::-webkit-clear-button { display: none; }
        input.date-input--custom::-webkit-inner-spin-button { display: none; }
      `}</style>
    </div>
  )
}

export default DateInput


