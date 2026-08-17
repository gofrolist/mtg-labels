import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeedbackModal } from './FeedbackModal'

const submitFeedback = vi.fn()

vi.mock('../utils/feedback', () => ({
  submitFeedback: (...args: unknown[]) => submitFeedback(...args),
}))

describe('FeedbackModal', () => {
  beforeEach(() => {
    submitFeedback.mockReset()
    submitFeedback.mockResolvedValue(undefined)
  })

  it('rejects a too-short message without calling the API', async () => {
    const user = userEvent.setup()
    render(<FeedbackModal onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Message'), 'too short')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText(/at least 10 characters/i)).toBeInTheDocument()
    expect(submitFeedback).not.toHaveBeenCalled()
  })

  it('rejects a malformed email without calling the API', async () => {
    const user = userEvent.setup()
    render(<FeedbackModal onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Message'), 'The letters tab is missing Q')
    await user.type(screen.getByLabelText('Email (optional)'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(submitFeedback).not.toHaveBeenCalled()
  })

  it('submits the selected type, trimmed message and email, then confirms', async () => {
    const user = userEvent.setup()
    render(<FeedbackModal onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Idea' }))
    await user.type(screen.getByLabelText('Message'), '  Support A4 label sheets  ')
    await user.type(screen.getByLabelText('Email (optional)'), 'me@example.com')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText(/your feedback was sent/i)).toBeInTheDocument()
    expect(submitFeedback).toHaveBeenCalledWith({
      type: 'idea',
      message: 'Support A4 label sheets',
      email: 'me@example.com',
      url: window.location.href,
    })
  })

  it('omits an empty email', async () => {
    const user = userEvent.setup()
    render(<FeedbackModal onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Message'), 'Sorting by release date is off')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await screen.findByText(/your feedback was sent/i)
    expect(submitFeedback).toHaveBeenCalledWith(expect.objectContaining({ email: undefined }))
  })

  it('shows an error and stays open when sending fails', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    submitFeedback.mockRejectedValue(new Error('network down'))
    render(<FeedbackModal onClose={onClose} />)

    await user.type(screen.getByLabelText('Message'), 'Generating a PDF hangs forever')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be sent/i)
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
  })

  it('closes on Escape and on the close button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<FeedbackModal onClose={onClose} />)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('focuses the message field on open', () => {
    render(<FeedbackModal onClose={vi.fn()} />)
    expect(screen.getByLabelText('Message')).toHaveFocus()
  })

  it('moves focus to Done once sent, so the trap keeps holding', async () => {
    const user = userEvent.setup()
    render(<FeedbackModal onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Message'), 'The Matrix tab misaligns columns')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    const done = await screen.findByRole('button', { name: 'Done' })
    expect(done).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent(/your feedback was sent/i)
  })

  it('keeps a typed message when a drag-select ends on the backdrop', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<FeedbackModal onClose={onClose} />)

    const message = screen.getByLabelText('Message')
    await user.type(message, 'A long bug report worth not losing')

    // Gesture starts inside the textarea and releases over the backdrop, so the
    // click lands on the overlay even though the user never clicked it.
    const backdrop = screen.getByRole('dialog')
    await user.pointer([
      { target: message, keys: '[MouseLeft>]' },
      { target: backdrop, keys: '[/MouseLeft]' },
    ])

    expect(onClose).not.toHaveBeenCalled()
    expect(message).toHaveValue('A long bug report worth not losing')
  })

  it('still closes on a genuine backdrop click', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<FeedbackModal onClose={onClose} />)

    await user.click(screen.getByRole('dialog'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
