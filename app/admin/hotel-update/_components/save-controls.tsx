'use client'

import React from 'react'

export function ClientSaveButton({ formId }: { formId: string }) {
  const [open, setOpen] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [pendingSubmit, setPendingSubmit] = React.useState(false)

  const checkDirty = (form: HTMLFormElement): boolean => {
    const fields = Array.from(form.elements) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    for (const el of fields) {
      if (!el || !('type' in el)) continue
      const tag = el.tagName.toLowerCase()
      if (tag === 'button') continue
      if ((el as HTMLInputElement).type === 'submit') continue
      if ((el as HTMLInputElement).type === 'hidden') continue
      if ('checked' in el) {
        const input = el as HTMLInputElement
        if (input.type === 'checkbox' || input.type === 'radio') {
          if (input.checked !== input.defaultChecked) return true
          continue
        }
      }
      const current = (el as any).value ?? ''
      // 우선 data-initial 속성이 있으면 그것을 기준으로 비교 (controlled input 대비)
      const attrInitial = (el as HTMLElement).getAttribute?.('data-initial')
      const initial = attrInitial != null ? attrInitial : ((el as any).defaultValue ?? '')
      if (String(current) !== String(initial)) return true
    }
    return false
  }

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const form = document.getElementById(formId) as HTMLFormElement | null
    if (!form) return
    // debug: log current benefit_6 value before submission
    try {
      const benefit6El = form.querySelector('input[name="benefit_6"]') as HTMLInputElement | null
      // eslint-disable-next-line no-console
      console.log('[debug] client before submit benefit_6 =', benefit6El?.value ?? '(missing)')
    } catch {}
    const dirty = checkDirty(form)
    if (!dirty) {
      setMessage('변경 사항이 없습니다.')
      setPendingSubmit(false)
      setOpen(true)
    } else {
      setMessage('변경 사항을 저장하였습니다.')
      setPendingSubmit(true)
      setOpen(true)
    }
  }

  const onConfirm = () => {
    setOpen(false)
    if (pendingSubmit) {
      const form = document.getElementById(formId) as HTMLFormElement | null
      if (form) {
        try {
          // @ts-ignore
          form.requestSubmit ? form.requestSubmit() : form.submit()
        } catch {
          form.submit()
        }
      }
    }
  }

  return (
    <>
      <button onClick={onClick} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">저장</button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[min(90vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-4 shadow-xl">
            <div className="text-sm">{message}</div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200" onClick={() => setOpen(false)}>취소</button>
              <button type="button" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700" onClick={onConfirm}>OK</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


