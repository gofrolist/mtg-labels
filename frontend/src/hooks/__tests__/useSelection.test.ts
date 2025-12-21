import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSelection } from '../useSelection'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
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

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useSelection', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useSelection())
    expect(result.current.selection.selectedSetIds).toEqual([])
    expect(result.current.selection.viewMode).toBe('sets')
  })

  it('toggles set selection', () => {
    const { result } = renderHook(() => useSelection())

    act(() => {
      result.current.toggleSetSelection('set-1')
    })

    expect(result.current.selection.selectedSetIds).toContain('set-1')

    act(() => {
      result.current.toggleSetSelection('set-1')
    })

    expect(result.current.selection.selectedSetIds).not.toContain('set-1')
  })

  it('sets quantity', () => {
    const { result } = renderHook(() => useSelection())

    act(() => {
      result.current.setQuantity('set-1', 5)
    })

    expect(result.current.selection.quantities['set-1']).toBe(5)
  })

  it('clamps quantity to valid range', () => {
    const { result } = renderHook(() => useSelection())

    act(() => {
      result.current.setQuantity('set-1', 200)
    })

    expect(result.current.selection.quantities['set-1']).toBe(100)

    act(() => {
      result.current.setQuantity('set-1', 0)
    })

    expect(result.current.selection.quantities['set-1']).toBe(1)
  })
})
