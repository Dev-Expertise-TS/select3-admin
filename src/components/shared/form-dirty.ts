'use client'

export function isFormDirty(form: HTMLFormElement): boolean {
  const fields = Array.from(form.elements) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  for (const el of fields) {
    if (!el || !('type' in el)) continue
    const tag = el.tagName.toLowerCase()
    if (tag === 'button') continue
    if ((el as HTMLInputElement).type === 'submit') continue
    const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    // hidden은 기본적으로 무시
    if ((input as HTMLInputElement).type === 'hidden') continue
    // 체크박스/라디오 처리
    if ('checked' in input && ((input as HTMLInputElement).type === 'checkbox' || (input as HTMLInputElement).type === 'radio')) {
      const i = input as HTMLInputElement
      if (i.checked !== i.defaultChecked) return true
      continue
    }
    const current = String((input as HTMLInputElement).value ?? '')
    const initAttr = (input as HTMLElement).getAttribute?.('data-initial')
    const initial = initAttr != null ? String(initAttr) : String((input as HTMLInputElement).defaultValue ?? '')
    if (current !== initial) return true
  }
  return false
}


