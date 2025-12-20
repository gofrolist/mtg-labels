import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SelectionCounter } from './SelectionCounter'

describe('SelectionCounter', () => {
  it('displays selected count', () => {
    render(<SelectionCounter selectedCount={5} totalLabels={150} totalPages={5} />)
    expect(screen.getByText((_content, element) => {
      return element?.textContent === '5 selected' || false
    })).toBeInTheDocument()
  })

  it('displays total labels', () => {
    render(<SelectionCounter selectedCount={5} totalLabels={150} totalPages={5} />)
    expect(screen.getByText(/150 labels/i)).toBeInTheDocument()
  })

  it('displays total pages', () => {
    render(<SelectionCounter selectedCount={5} totalLabels={150} totalPages={5} />)
    expect(screen.getByText(/5 pages/i)).toBeInTheDocument()
  })

  it('shows zero when no items selected', () => {
    render(<SelectionCounter selectedCount={0} totalLabels={0} totalPages={0} />)
    expect(screen.getByText((_content, element) => {
      return element?.textContent === '0 selected' || false
    })).toBeInTheDocument()
  })
})
