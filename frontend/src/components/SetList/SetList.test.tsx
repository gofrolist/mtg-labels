import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SetList } from './SetList'
import type { MTGSet } from '../../types'

const mockSets: MTGSet[] = [
  {
    id: 'set-1',
    name: 'Test Set 1',
    code: 'TS1',
    set_type: 'expansion',
    card_count: 100,
    released_at: '2023-01-01',
    icon_svg_uri: null,
    scryfall_uri: null,
  },
  {
    id: 'set-2',
    name: 'Test Set 2',
    code: 'TS2',
    set_type: 'expansion',
    card_count: 200,
    released_at: '2023-02-01',
    icon_svg_uri: null,
    scryfall_uri: null,
  },
]

describe('SetList', () => {
  it('renders grouped sets', () => {
    render(
      <SetList
        groupedSets={{ expansion: mockSets }}
        selectedSetIds={[]}
        quantities={{}}
        onToggleSet={vi.fn()}
        onQuantityChange={vi.fn()}
        openGroups={new Set(['expansion'])}
        onToggleGroup={vi.fn()}
      />
    )
    expect(screen.getByText('Test Set 1')).toBeInTheDocument()
    expect(screen.getByText('Test Set 2')).toBeInTheDocument()
  })

  it('renders group title', () => {
    render(
      <SetList
        groupedSets={{ expansion: mockSets }}
        selectedSetIds={[]}
        quantities={{}}
        onToggleSet={vi.fn()}
        onQuantityChange={vi.fn()}
      />
    )
    expect(screen.getByText('expansion')).toBeInTheDocument()
  })
})
