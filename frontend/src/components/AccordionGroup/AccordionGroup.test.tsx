import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AccordionGroup } from './AccordionGroup'

describe('AccordionGroup', () => {
  it('renders group title', () => {
    render(
      <AccordionGroup title="Test Group" isOpen={false} onToggle={vi.fn()}>
        <div>Content</div>
      </AccordionGroup>
    )
    expect(screen.getByText('Test Group')).toBeInTheDocument()
  })

  it('calls onToggle when header is clicked', () => {
    const onToggle = vi.fn()
    render(
      <AccordionGroup title="Test Group" isOpen={false} onToggle={onToggle}>
        <div>Content</div>
      </AccordionGroup>
    )
    fireEvent.click(screen.getByText('Test Group'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('shows content when isOpen is true', () => {
    render(
      <AccordionGroup title="Test Group" isOpen={true} onToggle={vi.fn()}>
        <div>Content</div>
      </AccordionGroup>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('hides content when isOpen is false', () => {
    render(
      <AccordionGroup title="Test Group" isOpen={false} onToggle={vi.fn()}>
        <div>Content</div>
      </AccordionGroup>
    )
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })
})
