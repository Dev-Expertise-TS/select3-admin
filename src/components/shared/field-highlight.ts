/**
 * 공통 필드 하이라이트 유틸리티
 * 저장 후 변경된 필드에 일시적 하이라이트 효과 적용
 */

export interface HighlightFieldsOptions {
  /** 하이라이트할 필드들의 선택자 또는 요소들 */
  fields: string | NodeListOf<Element> | Element[]
  /** 하이라이트 지속 시간 (ms, 기본값: 1500) */
  duration?: number
  /** 하이라이트 CSS 클래스 (기본값: 'bg-yellow-50') */
  highlightClass?: string
  /** 하이라이트할 상위 컨테이너 (field 대신 상위 요소에 적용) */
  container?: Element | null
}

/**
 * 필드들에 일시적 하이라이트 효과 적용
 */
export function highlightFields(options: HighlightFieldsOptions): void {
  const { fields, duration = 1500, highlightClass = 'bg-yellow-50', container } = options

  let elements: Element[]

  if (typeof fields === 'string') {
    elements = Array.from(document.querySelectorAll(fields))
  } else if (fields instanceof NodeList) {
    elements = Array.from(fields)
  } else {
    elements = Array.from(fields)
  }

  const targetElements = container ? [container] : elements

  targetElements.forEach((el) => {
    if (el instanceof HTMLElement) {
      el.classList.add(highlightClass)
      setTimeout(() => {
        el.classList.remove(highlightClass)
      }, duration)
    }
  })
}

/**
 * 특정 행(row)의 input 필드들에 하이라이트 적용
 */
export function highlightRowFields(row: Element | null, inputSelector = 'input', options?: Omit<HighlightFieldsOptions, 'fields'>): void {
  if (!row) return
  
  const inputs = row.querySelectorAll(inputSelector)
  highlightFields({
    fields: inputs,
    ...options
  })
}
