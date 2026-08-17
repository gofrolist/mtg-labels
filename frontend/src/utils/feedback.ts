import * as Sentry from '@sentry/react'
import { sentryEnabled } from './sentry'

export type FeedbackType = 'bug' | 'idea' | 'other'

export interface FeedbackInput {
  type: FeedbackType
  message: string
  email?: string
  /** Page the feedback is about; captured by the modal when it opens. */
  url?: string
}

/**
 * Send user-submitted feedback to Sentry's User Feedback inbox via the
 * delivery-aware `sendFeedback` API — its returned promise resolves only once
 * the envelope has actually been sent (and rejects on transport failure or
 * timeout), unlike `captureFeedback` which just enqueues locally. That lets the
 * modal show a real success/failure state instead of an unconditional toast.
 * Like every helper here it no-ops without a DSN; the modal still reports
 * success (dev no-op) so local/dev flows aren't blocked.
 */
export async function submitFeedback(input: FeedbackInput): Promise<void> {
  if (!sentryEnabled) {
    console.debug('[feedback] Sentry disabled — feedback not sent:', input)
    return
  }
  await Sentry.sendFeedback({
    message: input.message,
    email: input.email,
    url: input.url ?? window.location.href,
    source: 'feedback-modal',
    tags: { 'feedback.type': input.type },
  })
}
