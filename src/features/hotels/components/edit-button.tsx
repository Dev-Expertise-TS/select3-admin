'use client'

import React from 'react'
import { Button } from '@/components/ui/button'

export function EditButton() {
  const handleClick = () => {
    // TODO: 수정 모드 토글 기능 구현
    console.log('수정 버튼 클릭됨')
  }

  return (
    <Button 
      type="button" 
      variant="teal"
      size="sm"
      onClick={handleClick}
    >
      수정 하기
    </Button>
  )
}
