import { render, screen } from '@testing-library/react'
import React from 'react'
import { Button } from '@/components/ui/button'

describe('Button (ui)', () => {
  it('renders children', () => {
    render(<Button>확인</Button>)
    expect(screen.getByText('확인')).toBeInTheDocument()
  })
})


