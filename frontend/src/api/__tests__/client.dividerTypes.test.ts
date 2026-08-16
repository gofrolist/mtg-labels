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

describe('generatePDF divider types', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('appends divider types joined by comma for sets view', async () => {
    const fetchMock = mockFetchOk()
    await generatePDF({
      setIds: ['s1'],
      template: 'avery5160',
      placeholders: 0,
      viewMode: 'sets',
      dividerTypes: ['White:Creature', 'Blue:Instant'],
    })
    const body = fetchMock.mock.calls[0][1].body as FormData
    expect(body.get('divider_types')).toBe('White:Creature,Blue:Instant')
  })

  it('omits divider types when none are provided', async () => {
    const fetchMock = mockFetchOk()
    await generatePDF({
      setIds: ['s1'],
      template: 'avery5160',
      placeholders: 0,
      viewMode: 'sets',
    })
    const body = fetchMock.mock.calls[0][1].body as FormData
    expect(body.get('divider_types')).toBeNull()
  })

  it('omits divider types in the types view', async () => {
    const fetchMock = mockFetchOk()
    await generatePDF({
      cardTypeIds: ['White:Creature'],
      template: 'avery5160',
      placeholders: 0,
      viewMode: 'types',
      dividerTypes: ['White:Creature'],
    })
    const body = fetchMock.mock.calls[0][1].body as FormData
    expect(body.get('divider_types')).toBeNull()
  })
})
