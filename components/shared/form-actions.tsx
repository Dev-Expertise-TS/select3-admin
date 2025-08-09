'use client'

import React, { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { cn } from '@/lib/utils'

export function SaveSubmitButton({ formId }: { formId?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      form={formId}
      className={cn('rounded px-3 py-1.5 text-sm text-white', pending ? 'bg-amber-500' : 'bg-gray-900 hover:bg-black')}
      disabled={pending}
    >
      {pending ? '반영중...' : '저장'}
    </button>
  )
}

export function CreateSubmitButton({ formId }: { formId?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      form={formId}
      className={cn('rounded px-3 py-1.5 text-sm text-white', pending ? 'bg-amber-500' : 'bg-blue-600 hover:bg-blue-700')}
      disabled={pending}
    >
      {pending ? '반영중...' : '저장'}
    </button>
  )
}

export function DeleteConfirmButton({
  formId,
  confirmText = '정말 삭제 하시겠습니까?',
}: {
  formId: string
  confirmText?: string
}) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const onConfirm = () => {
    const form = document.getElementById(formId) as HTMLFormElement | null
    if (!form) {
      setOpen(false)
      return
    }
    setSubmitting(true)
    // Use requestSubmit if available for proper submit event
    try {
      // @ts-expect-error requestSubmit not in all TS libs
      form.requestSubmit ? form.requestSubmit() : form.submit()
    } finally {
      setOpen(false)
      // keep disabled briefly; will re-enable after navigation/re-render
      setTimeout(() => setSubmitting(false), 800)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('rounded px-3 py-1.5 text-sm', submitting ? 'bg-amber-500 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100')}
        disabled={submitting}
      >
        {submitting ? '반영중...' : '삭제'}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-[90vw] max-w-sm rounded-lg border bg-white p-4 shadow-xl">
            <div className="text-sm">{confirmText}</div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
                onClick={() => setOpen(false)}
              >
                아니오
              </button>
              <button
                type="button"
                className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
                onClick={onConfirm}
              >
                예
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}


