import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generatePDF } from '../api'

// Mock fetch globally
const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

describe('generatePDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates PDF for sets', async () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })
    vi.mocked(mockFetch).mockResolvedValue({
      ok: true,
      blob: async () => mockBlob,
    } as Response)

    const result = await generatePDF(
      ['set-1', 'set-2'],
      null,
      'avery5160',
      0,
      'sets'
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/generate-pdf'),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    )
    expect(result).toBe(mockBlob)
  })

  it('generates PDF for card types', async () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })
    vi.mocked(mockFetch).mockResolvedValue({
      ok: true,
      blob: async () => mockBlob,
    } as Response)

    await generatePDF(
      null,
      ['White:Creature', 'Blue:Instant'],
      'avery5160',
      0,
      'types'
    )

    expect(mockFetch).toHaveBeenCalled()
  })

  it('handles API errors', async () => {
    vi.mocked(mockFetch).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ detail: 'No sets selected' }),
    } as Response)

    await expect(
      generatePDF([], null, 'avery5160', 0, 'sets')
    ).rejects.toThrow()
  })

  it('handles network errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(
      generatePDF(['set-1'], null, 'avery5160', 0, 'sets')
    ).rejects.toThrow('Unable to connect to the server')
  })
})
