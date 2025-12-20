import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SetList } from '../../components/SetList/SetList'
import type { MTGSet } from '../../types'
import { useState } from 'react'

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
]

// Test wrapper component that manages accordion state
function SetListWrapper({ groupedSets, selectedSetIds, quantities, onToggleSet, onQuantityChange }: any) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  const handleToggleGroup = (groupName: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
  }

  return (
    <SetList
      groupedSets={groupedSets}
      selectedSetIds={selectedSetIds}
      quantities={quantities}
      onToggleSet={onToggleSet}
      onQuantityChange={onQuantityChange}
      openGroups={openGroups}
      onToggleGroup={handleToggleGroup}
    />
  )
}

describe('Set Selection Integration', () => {
  it('allows selecting and deselecting sets', async () => {
    const onToggleSet = vi.fn()
    const onQuantityChange = vi.fn()

    render(
      <SetListWrapper
        groupedSets={{ expansion: mockSets }}
        selectedSetIds={[]}
        quantities={{}}
        onToggleSet={onToggleSet}
        onQuantityChange={onQuantityChange}
      />
    )

    // Open the group first
    const groupButton = screen.getByText('expansion')
    fireEvent.click(groupButton)

    await waitFor(() => {
      expect(screen.getByText('Test Set 1')).toBeInTheDocument()
    })

    // Select a set
    const checkbox = screen.getByRole('checkbox', { name: /select test set 1/i })
    fireEvent.click(checkbox)

    expect(onToggleSet).toHaveBeenCalledWith('set-1')
  })
})
