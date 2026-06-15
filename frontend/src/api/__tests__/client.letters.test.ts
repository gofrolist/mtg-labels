import { describe, it, expect, vi, afterEach } from 'vitest'
import { generatePDF } from '../client'

function mockFetchOk() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    blob: async () => new Blob(['pdf'], { type: 'application/pdf' }),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('generatePDF letters', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('appends letters joined by comma for sets view', async () => {
    const fetchMock = mockFetchOk()
    await generatePDF({
      setIds: ['s1'],
      template: 'avery5160',
      placeholders: 0,
      viewMode: 'sets',
      letters: ['A', 'B', 'C'],
    })
    const body = fetchMock.mock.calls[0][1].body as FormData
    expect(body.get('letters')).toBe('A,B,C')
  })

  it('omits letters when none are provided', async () => {
    const fetchMock = mockFetchOk()
    await generatePDF({
      setIds: ['s1'],
      template: 'avery5160',
      placeholders: 0,
      viewMode: 'sets',
    })
    const body = fetchMock.mock.calls[0][1].body as FormData
    expect(body.get('letters')).toBeNull()
  })
})
