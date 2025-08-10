import { render, screen } from '@testing-library/react'
import React from 'react'
import { Input } from '@/components/ui/input'

describe('Input (ui)', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="검색" />)
    expect(screen.getByPlaceholderText('검색')).toBeInTheDocument()
  })
})


