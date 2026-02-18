import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SetItem } from './SetItem'
import type { MTGSet } from '../../types'

const mockSet: MTGSet = {
  id: 'test-1',
  name: 'Test Set',
  code: 'TS1',
  set_type: 'expansion',
  card_count: 100,
  released_at: '2023-01-01',
  icon_svg_uri: 'https://example.com/icon.svg',
  scryfall_uri: 'https://scryfall.com/sets/ts1',
}

describe('SetItem', () => {
  it('renders set name and code', () => {
    render(
      <SetItem
        set={mockSet}
        isSelected={false}
        quantity={1}
        showQuantityInput={false}
        onToggle={vi.fn()}
        onQuantityChange={vi.fn()}
      />
    )
    expect(screen.getByText('Test Set')).toBeInTheDocument()
  })

  it('shows checked checkbox when selected', () => {
    render(
      <SetItem
        set={mockSet}
        isSelected={true}
        quantity={1}
        showQuantityInput={false}
        onToggle={vi.fn()}
        onQuantityChange={vi.fn()}
      />
    )
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('calls onToggle when checkbox is clicked', () => {
    const onToggle = vi.fn()
    render(
      <SetItem
        set={mockSet}
        isSelected={false}
        quantity={1}
        showQuantityInput={false}
        onToggle={onToggle}
        onQuantityChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('shows quantity input when selected and showQuantityInput is true', () => {
    render(
      <SetItem
        set={mockSet}
        isSelected={true}
        quantity={5}
        showQuantityInput={true}
        onToggle={vi.fn()}
        onQuantityChange={vi.fn()}
      />
    )
    const input = screen.getByDisplayValue('5')
    expect(input).toBeInTheDocument()
  })

  it('calls onQuantityChange when quantity changes', () => {
    const onQuantityChange = vi.fn()
    render(
      <SetItem
        set={mockSet}
        isSelected={true}
        quantity={1}
        showQuantityInput={true}
        onToggle={vi.fn()}
        onQuantityChange={onQuantityChange}
      />
    )
    const input = screen.getByDisplayValue('1')
    fireEvent.change(input, { target: { value: '10' } })
    expect(onQuantityChange).toHaveBeenCalledWith(10)
  })
})
