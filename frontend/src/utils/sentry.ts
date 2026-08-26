import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN

/**
 * True when a DSN is configured. Every helper below no-ops without it, so the
 * SDK stays inert in local/dev/test and only reports from real deployments.
 */
export const sentryEnabled = Boolean(dsn)

/** Initialize Sentry once at startup. Safe to call when no DSN is set. */
export function initSentry(): void {
  if (!dsn) return
  Sentry.init({
    dsn,
    integrations: [Sentry.browserTracingIntegration()],
    // Stale-chunk errors after a deploy: a tab on the old build imports a
    // content-hashed chunk that no longer exists on the CDN. Deploy-timing
    // noise, not actionable bugs.
    ignoreErrors: [
      /Failed to fetch dynamically imported module/i,
      /Importing a module script failed/i,
      /error loading dynamically imported module/i,
      // Browser-extension content scripts injected into the page. Their
      // uncaught errors reach window.onerror and get billed to us; none of
      // this code is ours.
      /runtime\.sendMessage/i,
      /Extension context invalidated/i,
      /message channel closed before a response was received/i,
    ],
    // Same reason: drop anything whose stack points at extension-injected code.
    denyUrls: [/^chrome-extension:\/\//i, /^moz-extension:\/\//i, /^safari-(web-)?extension:\/\//i],
    tracesSampleRate: 0.1,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    // Per-deploy regression grouping (git SHA injected at build time).
    // Empty → no release tag.
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
  })
}

/** Capture an uncaught render error along with its React component stack. */
export function reportRenderError(error: Error, componentStack?: string | null): void {
  if (!sentryEnabled) return
  Sentry.captureException(error, {
    contexts: componentStack ? { react: { componentStack } } : undefined,
  })
}
