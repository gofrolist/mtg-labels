import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SetFilterCustomizer } from '../SetFilterCustomizer'
import {
  DEFAULT_SET_TYPES,
  DEFAULT_IGNORED_SET_CODES,
  DEFAULT_MINIMUM_SET_SIZE,
} from '../../../constants/setFilterDefaults'
import type { MTGSet, SetFilterPreferences } from '../../../types'

const defaultPrefs: SetFilterPreferences = {
  activeSetTypes: [...DEFAULT_SET_TYPES],
  ignoredSetCodes: [...DEFAULT_IGNORED_SET_CODES],
  minimumSetSize: DEFAULT_MINIMUM_SET_SIZE,
}

const sampleSets: MTGSet[] = [
  {
    id: '1',
    name: 'Mystery Booster Playtest Cards',
    code: 'cmb1',
    set_type: 'expansion',
    card_count: 100,
  } as MTGSet,
  {
    id: '2',
    name: 'Some Promo',
    code: 'p1',
    set_type: 'promo',
    card_count: 50,
  } as MTGSet,
]

function makeProps(overrides: Partial<React.ComponentProps<typeof SetFilterCustomizer>> = {}) {
  return {
    isOpen: true,
    preferences: defaultPrefs,
    allSets: sampleSets,
    onActiveSetTypesChange: vi.fn(),
    onIgnoredSetCodesChange: vi.fn(),
    onMinimumSetSizeChange: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  }
}

describe('SetFilterCustomizer', () => {
  it('renders the three sections', () => {
    render(<SetFilterCustomizer {...makeProps()} />)
    expect(screen.getByRole('heading', { name: /set types/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /ignored sets/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/minimum set size/i)).toBeInTheDocument()
  })

  it('toggling a set type calls onActiveSetTypesChange with the type removed', () => {
    const onActiveSetTypesChange = vi.fn()
    render(<SetFilterCustomizer {...makeProps({ onActiveSetTypesChange })} />)
    const coreCheckbox = screen.getByRole('checkbox', { name: /^core/i })
    fireEvent.click(coreCheckbox)
    expect(onActiveSetTypesChange).toHaveBeenCalledWith(
      defaultPrefs.activeSetTypes.filter((t) => t !== 'core'),
    )
  })

  it('toggling an ignored set calls onIgnoredSetCodesChange with the code removed', () => {
    const onIgnoredSetCodesChange = vi.fn()
    render(<SetFilterCustomizer {...makeProps({ onIgnoredSetCodesChange })} />)
    // cmb1 is ignored by default; unchecking should remove it
    const cmb1Checkbox = screen.getByRole('checkbox', { name: /cmb1/i })
    fireEvent.click(cmb1Checkbox)
    expect(onIgnoredSetCodesChange).toHaveBeenCalledWith(
      defaultPrefs.ignoredSetCodes.filter((c) => c !== 'cmb1'),
    )
  })

  it('changing minimum set size calls onMinimumSetSizeChange with parsed number', () => {
    const onMinimumSetSizeChange = vi.fn()
    render(<SetFilterCustomizer {...makeProps({ onMinimumSetSizeChange })} />)
    const input = screen.getByLabelText(/minimum set size/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: '25' } })
    expect(onMinimumSetSizeChange).toHaveBeenCalledWith(25)
  })

  it('clicking Reset to defaults calls onReset', () => {
    const onReset = vi.fn()
    render(<SetFilterCustomizer {...makeProps({ onReset })} />)
    fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }))
    expect(onReset).toHaveBeenCalled()
  })

  it('resolves ignored set names from allSets', () => {
    render(<SetFilterCustomizer {...makeProps()} />)
    // cmb1 is in default ignored codes AND in sampleSets, so its name should render
    expect(screen.getByText(/Mystery Booster Playtest Cards/i)).toBeInTheDocument()
  })
})
