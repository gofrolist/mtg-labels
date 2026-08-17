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
})
