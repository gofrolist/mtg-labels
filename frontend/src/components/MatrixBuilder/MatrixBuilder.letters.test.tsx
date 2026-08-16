import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MatrixBuilder } from './MatrixBuilder'
import type { AlphabetSelection } from '../../types'

const GROUPED_TYPES = {
  White: ['Creature', 'Instant'],
  Blue: ['Creature', 'Sorcery'],
}

function baseProps(alphabet: AlphabetSelection, onAlphabetChange = vi.fn()) {
  return {
    selectedSetCount: 1,
    sampleSet: { name: 'Secrets of Strixhaven', code: 'stx', releasedAt: '2021-04-23' },
    groupedTypes: GROUPED_TYPES,
    alphabet,
    selectedTypeIds: [],
    dividersPerSet: 1,
    setLabelCount: 1,
    totalLabels: 1,
    onAlphabetChange,
    onGoToSets: vi.fn(),
    onGoToTypes: vi.fn(),
  }
}

describe('MatrixBuilder letters control', () => {
  it('hides the custom input unless in custom mode', () => {
    render(<MatrixBuilder {...baseProps({ mode: 'off', customInput: '' })} />)
    expect(screen.queryByPlaceholderText(/A-F, H, L-Z/i)).not.toBeInTheDocument()
  })

  it('shows the custom input in custom mode', () => {
    render(<MatrixBuilder {...baseProps({ mode: 'custom', customInput: '' })} />)
    expect(screen.getByPlaceholderText(/A-F, H, L-Z/i)).toBeInTheDocument()
  })

  it('shows an inline error for an invalid custom spec', () => {
    render(<MatrixBuilder {...baseProps({ mode: 'custom', customInput: 'Z-A' })} />)
    expect(screen.getByText(/backwards/i)).toBeInTheDocument()
  })

  it('calls onAlphabetChange when typing in the custom input', () => {
    const onAlphabetChange = vi.fn()
    render(<MatrixBuilder {...baseProps({ mode: 'custom', customInput: '' }, onAlphabetChange)} />)
    fireEvent.change(screen.getByPlaceholderText(/A-F, H, L-Z/i), {
      target: { value: 'A-C' },
    })
    expect(onAlphabetChange).toHaveBeenCalledWith({ mode: 'custom', customInput: 'A-C' })
  })

  it('associates the mode select and custom input with accessible labels', () => {
    render(<MatrixBuilder {...baseProps({ mode: 'custom', customInput: '' })} />)
    expect(screen.getByLabelText(/alphabet divider letters/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Custom divider letters')).toBeInTheDocument()
  })

  it('shows a neutral hint (not an error) for an empty custom field', () => {
    render(<MatrixBuilder {...baseProps({ mode: 'custom', customInput: '' })} />)
    expect(screen.getByText(/enter letters and ranges/i)).toBeInTheDocument()
    expect(screen.queryByText(/enter at least one letter/i)).not.toBeInTheDocument()
  })
})
