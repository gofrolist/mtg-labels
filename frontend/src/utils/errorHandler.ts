/**
 * Error handling utilities for API calls and user-facing errors.
 */

export interface ApiError {
  message: string
  status?: number
  detail?: string
}

/**
 * Convert an error to a user-friendly message.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'detail' in error &&
    typeof error.detail === 'string'
  ) {
    return error.detail
  }

  return 'An unexpected error occurred. Please try again.'
}

/**
 * Handle API error response.
 */
export async function handleApiError(response: Response): Promise<ApiError> {
  let detail = `HTTP ${response.status}: ${response.statusText}`

  try {
    const data = await response.json()
    if (data.detail) {
      detail = data.detail
    } else if (data.message) {
      detail = data.message
    }
  } catch {
    // If response is not JSON, use status text
  }

  return {
    message: detail,
    status: response.status,
    detail,
  }
}

/**
 * Check if error is a network error.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }
  return false
}

/**
 * Get user-friendly error message for network errors.
 */
export function getNetworkErrorMessage(): string {
  return 'Unable to connect to the server. Please check your internet connection and try again.'
}
