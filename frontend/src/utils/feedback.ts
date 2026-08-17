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
    // Dev convenience only. A production build with no DSN is a misconfigured
    // deploy, and silently resolving there would tell users their message was
    // sent while dropping it — so let those surface the modal's error state.
    if (!import.meta.env.DEV) {
      throw new Error('Feedback is unavailable: VITE_SENTRY_DSN is not configured')
    }
    console.debug('[feedback] Sentry disabled — feedback not sent:', input)
    return
  }
  // `sendFeedback` applies `tags` via `getCurrentScope().setTags()` and never
  // reverts it, which would leave `feedback.type` stuck on every later event in
  // the session. A forked scope keeps the tag on this entry alone.
  await Sentry.withScope(() =>
    Sentry.sendFeedback({
      message: input.message,
      email: input.email,
      url: input.url ?? window.location.href,
      source: 'feedback-modal',
      tags: { 'feedback.type': input.type },
    })
  )
}
