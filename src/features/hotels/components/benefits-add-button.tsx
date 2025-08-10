'use client'

import React from 'react'
import { Button } from '@/components/ui/button'

export function BenefitsAddButton() {
  const handleClick = () => {
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__benefitsManagerOpenPopup) {
      const openPopup = (window as unknown as Record<string, unknown>).__benefitsManagerOpenPopup as () => void
      openPopup()
    }
  }

  return (
    <Button 
      type="button" 
      variant="teal"
      size="sm"
      onClick={handleClick}
    >
      혜택 추가
    </Button>
  )
}
