'use client'

import React from 'react'
import { Button } from '@/components/ui/button'

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
      // hidden은 기본적으로 스킵하되, __benefits_dirty 마커는 변경 감지에 포함
      if ((el as HTMLInputElement).type === 'hidden' && (el as HTMLInputElement).name !== '__benefits_dirty') continue
      if ('checked' in el) {
        const input = el as HTMLInputElement
        if (input.type === 'checkbox' || input.type === 'radio') {
          if (input.checked !== input.defaultChecked) return true
          continue
        }
      }
      const current = (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value ?? ''
      // 우선 data-initial 속성이 있으면 그것을 기준으로 비교 (controlled input 대비)
      const attrInitial = (el as HTMLElement).getAttribute?.('data-initial')
      const initial = attrInitial != null ? attrInitial : (
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? (el.defaultValue ?? '') : ''
      )
      if (String(current) !== String(initial)) return true
    }
    return false
  }

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const form = document.getElementById(formId) as HTMLFormElement | null
    if (!form) return
    // debug: log current benefit_6 value before submission
    // 디버그 로그 제거
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
    const form = document.getElementById(formId) as HTMLFormElement | null
    if (!form) return

    // 수동 커밋 유틸: 현재 값을 data-initial과 defaultValue로 동기화
    const commitInputsLocally = () => {
      try {
          const fields = Array.from(form.elements) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
        fields.forEach((el) => {
          if (!el || !('type' in el)) return
          const tag = el.tagName.toLowerCase()
          if (tag === 'button') return
          if ((el as HTMLInputElement).type === 'submit') return
          if ((el as HTMLInputElement).type === 'hidden') return
          const input = el as HTMLInputElement
          const cur = input.value ?? ''
          input.setAttribute('data-initial', String(cur))
          try { input.defaultValue = cur } catch {}
        })
      } catch {}
    }

    if (pendingSubmit) {
      // 변경 사항이 있을 때: 하이라이트 + 서버 액션 제출
      let changed: string[] = []
      try {
        const fields = Array.from(form.elements) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
        changed = fields
          .filter((el) => {
            if (!el || !('type' in el)) return false
            const tag = el.tagName.toLowerCase()
            if (tag === 'button') return false
            if ((el as HTMLInputElement).type === 'submit') return false
            if ((el as HTMLInputElement).type === 'hidden' && (el as HTMLInputElement).name !== '__benefits_dirty') return false
            return true
          })
          .map((el) => el as HTMLInputElement)
          .filter((el) => {
            let isChanged = false
            if (el.type === 'checkbox' || el.type === 'radio') {
              isChanged = el.checked !== el.defaultChecked
            } else {
              const cur = el.value ?? ''
              const initAttr = el.getAttribute('data-initial')
                let init = initAttr != null ? initAttr : ''
                if (!init && (el as HTMLInputElement).defaultValue !== undefined) {
                  init = (el as HTMLInputElement).defaultValue
                }
              isChanged = String(cur) !== String(init)
            }
            return isChanged
          })
          .map((el) => el.name)
      } catch {}
      try {
        const formEl = form as HTMLFormElement
        changed.forEach((name) => {
          const input = formEl.querySelector(`[name="${CSS.escape(name)}"]`) as HTMLInputElement | null
          if (input) {
            input.classList.add('bg-yellow-50')
            input.setAttribute('data-initial', String(input.value ?? ''))
            try { input.defaultValue = input.value } catch {}
          }
        })
        setTimeout(() => {
          changed.forEach((name) => {
            const input = formEl.querySelector(`[name="${CSS.escape(name)}"]`) as HTMLInputElement | null
            input?.classList.remove('bg-yellow-50')
          })
        }, 1500)
      } catch {}
      try {
        try { window.dispatchEvent(new Event('benefits:commit')) } catch {}
        const submitFn = (form as unknown as { requestSubmit?: () => void }).requestSubmit
          ? () => (form as unknown as { requestSubmit: () => void }).requestSubmit()
          : () => form.submit()
        setTimeout(() => submitFn(), 50)
      } catch {
        setTimeout(() => form.submit(), 50)
      }
    } else {
      // 변경 사항 없다고 판단된 경우에도, 사용자가 입력한 현재 값을 로컬로 커밋하여 되돌림 방지
      commitInputsLocally()
    }
  }

  // removed sessionStorage-based highlighting; we highlight immediately on OK

  return (
    <>
      <Button onClick={onClick}>저장</Button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[min(90vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-4 shadow-xl">
            <div className="text-sm text-center">{message}</div>
            <div className="mt-4 flex justify-center">
              <Button type="button" onClick={onConfirm}>OK</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


