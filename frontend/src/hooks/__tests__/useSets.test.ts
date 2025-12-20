import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSets } from '../useSets'
import { fetchSets } from '../../services/api'

vi.mock('../../services/api')

describe('useSets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads sets on mount', async () => {
    const mockSets = [
      { id: '1', name: 'Set 1', code: 'S1', set_type: 'expansion', card_count: 100, released_at: '2023-01-01', icon_svg_uri: null, scryfall_uri: null },
    ]
    vi.mocked(fetchSets).mockResolvedValue(mockSets)

    const { result } = renderHook(() => useSets())

    expect(result.current.loading).toBe(true)
    expect(result.current.sets).toEqual([])

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.sets).toEqual(mockSets)
    expect(result.current.error).toBeNull()
  })

  it('handles errors', async () => {
    const errorMessage = 'Failed to fetch'
    vi.mocked(fetchSets).mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useSets())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(errorMessage)
    expect(result.current.sets).toEqual([])
  })
})
