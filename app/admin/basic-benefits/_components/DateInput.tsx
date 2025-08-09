'use client'

import React, { useId, useRef } from 'react'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
  defaultValue?: string
}

export default function DateInput({ name, defaultValue, className, ...rest }: Props) {
  const id = useId()
  const ref = useRef<HTMLInputElement>(null)
  const [hasValue, setHasValue] = React.useState(() => {
    if (!defaultValue) return false
    return typeof defaultValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(defaultValue)
  })
  const openPicker = () => {
    try {
      ref.current?.showPicker?.()
    } catch {}
    ref.current?.focus()
  }

  return (
    <div className="relative w-full">
      {!hasValue && (
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">날짜 선택</span>
      )}
      <input
        ref={ref}
        id={id}
        type="date"
        name={name}
        defaultValue={defaultValue && /^\d{4}-\d{2}-\d{2}$/.test(defaultValue) ? defaultValue : ''}
        placeholder=""
        onClick={openPicker}
        onChange={(e) => setHasValue(e.currentTarget.value !== '')}
        className={[
          'date-input--custom w-full rounded border px-2 py-1 text-sm pr-8 appearance-none',
          !hasValue ? 'text-transparent caret-transparent selection:bg-transparent' : '',
          className,
        ].filter(Boolean).join(' ')}
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

