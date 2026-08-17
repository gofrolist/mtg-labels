import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MatrixBuilder } from './MatrixBuilder'

const GROUPED_TYPES = {
  White: ['Creature', 'Instant'],
  Blue: ['Creature', 'Sorcery'],
}

function baseProps(overrides: Partial<Parameters<typeof MatrixBuilder>[0]> = {}) {
  return {
    selectedSetCount: 1,
    sampleSet: { name: 'Secrets of Strixhaven', code: 'stx', releasedAt: '2021-04-23' },
    selectedTypeIds: [] as string[],
    groupedTypes: GROUPED_TYPES,
    alphabet: { mode: 'off' as const, customInput: '' },
    dividersPerSet: 1,
    setLabelCount: 1,
    totalLabels: 1,
    onAlphabetChange: vi.fn(),
    onGoToSets: vi.fn(),
    onGoToTypes: vi.fn(),
    ...overrides,
  }
}

function typesAxis() {
  return screen.getByRole('button', { name: /edit the type selection/i })
}

describe('MatrixBuilder types axis', () => {
  it('reports an empty type selection', () => {
    render(<MatrixBuilder {...baseProps()} />)
    expect(typesAxis()).toHaveTextContent('None')
  })

  it('names a single selected type', () => {
    render(<MatrixBuilder {...baseProps({ selectedTypeIds: ['White:Creature'] })} />)
    expect(typesAxis()).toHaveTextContent('White - Creature')
  })

  it('counts a multi-type selection', () => {
    render(
      <MatrixBuilder {...baseProps({ selectedTypeIds: ['White:Creature', 'Blue:Sorcery'] })} />
    )
    expect(typesAxis()).toHaveTextContent('2 selected')
  })

  it('jumps to the Types tab', () => {
    const onGoToTypes = vi.fn()
    render(<MatrixBuilder {...baseProps({ onGoToTypes })} />)
    fireEvent.click(typesAxis())
    expect(onGoToTypes).toHaveBeenCalled()
  })

  it('jumps to the Sets tab', () => {
    const onGoToSets = vi.fn()
    render(<MatrixBuilder {...baseProps({ onGoToSets })} />)
    fireEvent.click(screen.getByRole('button', { name: /edit the set selection/i }))
    expect(onGoToSets).toHaveBeenCalled()
  })

  it('previews the first type in the picker order, not the tick order', () => {
    render(<MatrixBuilder {...baseProps({ selectedTypeIds: ['Blue:Sorcery', 'White:Instant'] })} />)
    expect(screen.getByText('White - Instant')).toBeInTheDocument()
  })

  it('previews the set code and date when no type is selected', () => {
    render(<MatrixBuilder {...baseProps()} />)
    expect(screen.getByText('STX - April 2021')).toBeInTheDocument()
  })

  it('reports the matrix size', () => {
    render(
      <MatrixBuilder
        {...baseProps({
          selectedSetCount: 2,
          selectedTypeIds: ['White:Creature', 'Blue:Sorcery'],
          alphabet: { mode: 'custom', customInput: 'A-C' },
          dividersPerSet: 6,
          setLabelCount: 2,
          totalLabels: 12,
        })}
      />
    )
    expect(screen.getByText(/6 labels per set × 2 sets =/i)).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('counts set copies so custom quantities still multiply out', () => {
    // 2 sets at quantity 3 = 6 copies, 2 dividers each = 12 labels.
    render(
      <MatrixBuilder
        {...baseProps({
          selectedSetCount: 2,
          selectedTypeIds: ['White:Creature', 'Blue:Sorcery'],
          dividersPerSet: 2,
          setLabelCount: 6,
          totalLabels: 12,
        })}
      />
    )
    expect(screen.getByText(/2 labels per set × 6 set copies =/i)).toBeInTheDocument()
    expect(screen.queryByText(/× 2 sets =/i)).not.toBeInTheDocument()
  })

  it('does not name a set the user never selected', () => {
    // The selection outlives the set filter, so a selected set can fail to
    // resolve — the hardcoded sample must not stand in for it.
    render(<MatrixBuilder {...baseProps({ selectedSetCount: 1, sampleSet: null })} />)
    expect(screen.queryByText(/Secrets of Strixhaven/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/STX - April 2021/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit the set selection/i })).toHaveTextContent(
      '1 selected'
    )
  })

  it('previews the hardcoded sample only when nothing is selected', () => {
    render(<MatrixBuilder {...baseProps({ selectedSetCount: 0, sampleSet: null })} />)
    expect(screen.getByText('Secrets of Strixhaven')).toBeInTheDocument()
    expect(screen.getByText('STX - April 2021')).toBeInTheDocument()
  })

  it('prompts for a set selection when none is made', () => {
    render(<MatrixBuilder {...baseProps({ selectedSetCount: 0, sampleSet: null })} />)
    expect(screen.getByText(/select at least one set in the sets tab/i)).toBeInTheDocument()
  })
})
