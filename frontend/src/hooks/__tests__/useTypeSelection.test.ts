import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTypeSelection, TYPE_SELECTION_STORAGE_KEY } from '../useTypeSelection'
import { STORAGE_PREFIX } from '../../utils/localStorage'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const STORAGE_KEY = `${STORAGE_PREFIX}${TYPE_SELECTION_STORAGE_KEY}`

function stored() {
  return JSON.parse(localStorageMock.getItem(STORAGE_KEY) ?? 'null')
}

describe('useTypeSelection', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.restoreAllMocks()
  })

  it('starts empty', () => {
    const { result } = renderHook(() => useTypeSelection())
    expect(result.current.typeSelection.selectedTypeIds).toEqual([])
    expect(result.current.typeSelection.quantities).toEqual({})
  })

  it('toggles a type on and off', () => {
    const { result } = renderHook(() => useTypeSelection())

    act(() => result.current.toggleTypeSelection('White:Creature'))
    expect(result.current.typeSelection.selectedTypeIds).toEqual(['White:Creature'])

    act(() => result.current.toggleTypeSelection('White:Creature'))
    expect(result.current.typeSelection.selectedTypeIds).toEqual([])
  })

  it('persists the selection to localStorage', () => {
    const { result } = renderHook(() => useTypeSelection())
    act(() => result.current.toggleTypeSelection('Blue:Instant'))
    expect(stored().selectedTypeIds).toEqual(['Blue:Instant'])
  })

  it('restores a persisted selection', () => {
    localStorageMock.setItem(
      STORAGE_KEY,
      JSON.stringify({ selectedTypeIds: ['Red:Sorcery'], quantities: { 'Red:Sorcery': 3 } })
    )
    const { result } = renderHook(() => useTypeSelection())
    expect(result.current.typeSelection.selectedTypeIds).toEqual(['Red:Sorcery'])
    expect(result.current.typeSelection.quantities).toEqual({ 'Red:Sorcery': 3 })
  })

  it('starts empty when the stored value is malformed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ selectedTypeIds: 'nope' }))
    const { result } = renderHook(() => useTypeSelection())
    expect(result.current.typeSelection.selectedTypeIds).toEqual([])
    expect(warn).toHaveBeenCalled()
  })

  it('selects a group without duplicating existing picks', () => {
    const { result } = renderHook(() => useTypeSelection())
    act(() => result.current.selectTypes(['White:Creature']))
    act(() => result.current.selectTypes(['White:Creature', 'White:Instant']))
    expect(result.current.typeSelection.selectedTypeIds).toEqual([
      'White:Creature',
      'White:Instant',
    ])
  })

  it('deselects a group, leaving other picks', () => {
    const { result } = renderHook(() => useTypeSelection())
    act(() => result.current.selectTypes(['White:Creature', 'White:Instant', 'Blue:Instant']))
    act(() => result.current.deselectTypes(['White:Creature', 'White:Instant']))
    expect(result.current.typeSelection.selectedTypeIds).toEqual(['Blue:Instant'])
  })

  it('selects and clears every type', () => {
    const { result } = renderHook(() => useTypeSelection())
    act(() => result.current.selectAllTypes(['White:Creature', 'Blue:Instant']))
    expect(result.current.typeSelection.selectedTypeIds).toHaveLength(2)

    act(() => result.current.deselectAllTypes())
    expect(result.current.typeSelection.selectedTypeIds).toEqual([])
  })

  it('clamps quantities to 1-100', () => {
    const { result } = renderHook(() => useTypeSelection())
    act(() => result.current.setTypeQuantity('White:Creature', 0))
    expect(result.current.typeSelection.quantities['White:Creature']).toBe(1)

    act(() => result.current.setTypeQuantity('White:Creature', 500))
    expect(result.current.typeSelection.quantities['White:Creature']).toBe(100)
  })

  it('keeps quantities for types that are toggled off', () => {
    const { result } = renderHook(() => useTypeSelection())
    act(() => result.current.setTypeQuantity('White:Creature', 4))
    act(() => result.current.toggleTypeSelection('White:Creature'))
    act(() => result.current.toggleTypeSelection('White:Creature'))
    expect(result.current.typeSelection.quantities['White:Creature']).toBe(4)
  })
})
