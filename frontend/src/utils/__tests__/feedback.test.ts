import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const sendFeedback = vi.fn()

vi.mock('@sentry/react', () => ({
  sendFeedback: (...args: unknown[]) => sendFeedback(...args),
}))

// `sentryEnabled` is computed at module load from the DSN, so each test picks
// its value before importing the module under test.
async function importFeedback(enabled: boolean) {
  vi.doMock('../sentry', () => ({ sentryEnabled: enabled }))
  vi.resetModules()
  return import('../feedback')
}

describe('submitFeedback', () => {
  beforeEach(() => {
    sendFeedback.mockReset()
    sendFeedback.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.doUnmock('../sentry')
    vi.resetModules()
  })

  it('sends message, email, url, source and type tag to Sentry', async () => {
    const { submitFeedback } = await importFeedback(true)

    await submitFeedback({
      type: 'idea',
      message: 'Add a dark parchment theme',
      email: 'planeswalker@example.com',
      url: 'https://labels.example.com/sets',
    })

    expect(sendFeedback).toHaveBeenCalledWith({
      message: 'Add a dark parchment theme',
      email: 'planeswalker@example.com',
      url: 'https://labels.example.com/sets',
      source: 'feedback-modal',
      tags: { 'feedback.type': 'idea' },
    })
  })

  it('falls back to the current location when no url is given', async () => {
    const { submitFeedback } = await importFeedback(true)

    await submitFeedback({ type: 'bug', message: 'PDF is blank' })

    expect(sendFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ url: window.location.href })
    )
  })

  it('propagates transport failures so the caller can show an error', async () => {
    const { submitFeedback } = await importFeedback(true)
    sendFeedback.mockRejectedValue(new Error('network down'))

    await expect(submitFeedback({ type: 'bug', message: 'PDF is blank' })).rejects.toThrow(
      'network down'
    )
  })

  it('no-ops when Sentry is disabled', async () => {
    const { submitFeedback } = await importFeedback(false)
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})

    await expect(submitFeedback({ type: 'other', message: 'hello' })).resolves.toBeUndefined()

    expect(sendFeedback).not.toHaveBeenCalled()
    debug.mockRestore()
  })
})
