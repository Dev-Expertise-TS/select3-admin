'use client'

import React, { useId, useRef } from 'react'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
  defaultValue?: string
}

export default function DateInput({ name, defaultValue, className, ...rest }: Props) {
  const id = useId()
  const ref = useRef<HTMLInputElement>(null)
  const openPicker = () => {
    try {
      // @ts-expect-error showPicker is not in TS lib yet for all targets
      ref.current?.showPicker?.()
    } catch {}
    ref.current?.focus()
  }

  return (
    <div className="relative w-full">
      <input
        ref={ref}
        id={id}
        type="date"
        name={name}
        defaultValue={defaultValue && /^\d{4}-\d{2}-\d{2}$/.test(defaultValue) ? defaultValue : ''}
        placeholder=""
        className={['w-full rounded border px-2 py-1 text-sm pr-8', className].filter(Boolean).join(' ')}
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
    </div>
  )
}

