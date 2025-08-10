'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

interface InlineCreateRowProps {
  fields: Array<{ name: string; label?: string; placeholder?: string }>
  hidden?: Record<string, string>
  action: string
  onCreated?: () => void
  confirmMessage?: string
}

export function InlineCreateRow({ fields, hidden = {}, action, onCreated, confirmMessage = '변경 사항을 저장하였습니다.' }: InlineCreateRowProps) {
  const [open, setOpen] = React.useState(false)
  const [showInputs, setShowInputs] = React.useState(false)
  const formId = React.useId()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setOpen(true)
  }

  const onConfirm = () => {
    const form = document.getElementById(formId) as HTMLFormElement | null
    if (form) form.submit()
    setOpen(false)
    setShowInputs(false)
    onCreated?.()
  }

  return (
    <div className="w-full">
      {!showInputs ? (
        <Button type="button" size="sm" onClick={() => setShowInputs(true)}>새 행 추가</Button>
      ) : (
        <form id={formId} action={action} method="post" onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
          {Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {fields.map((f) => (
            <input key={f.name} name={f.name} placeholder={f.placeholder ?? f.label ?? f.name} className="w-28 sm:w-32 md:w-36 lg:w-40 rounded border px-2 py-1" />
          ))}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" variant="secondary">저장</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowInputs(false)}>취소</Button>
          </div>
        </form>
      )}
      <ConfirmDialog open={open} message={confirmMessage} onClose={() => setOpen(false)} onConfirm={onConfirm} />
    </div>
  )
}


