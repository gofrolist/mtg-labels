import type { MTGSet, CardTypesByColor } from '../types'
import { getErrorMessage, handleApiError, isNetworkError, getNetworkErrorMessage } from '../utils/errorHandler'

// API base URL - defaults to production API on Fly.dev
// For local development, set VITE_API_BASE_URL=http://localhost:8080 in .env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://mtg-labels.fly.dev'

/**
 * Fetch all filtered MTG sets from the backend API.
 */
export async function fetchSets(): Promise<MTGSet[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sets`)

    if (!response.ok) {
      const error = await handleApiError(response)
      throw new Error(error.message)
    }

    return await response.json()
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(getNetworkErrorMessage())
    }
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Fetch card types organized by color from the backend API.
 */
export async function fetchCardTypes(): Promise<CardTypesByColor> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/card-types`)

    if (!response.ok) {
      const error = await handleApiError(response)
      throw new Error(error.message)
    }

    return await response.json()
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(getNetworkErrorMessage())
    }
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Generate PDF labels for selected sets or card types.
 */
export async function generatePDF(
  setIds: string[] | null,
  cardTypeIds: string[] | null,
  template: string,
  placeholders: number,
  viewMode: 'sets' | 'types'
): Promise<Blob> {
  try {
    const formData = new FormData()

    if (viewMode === 'types' && cardTypeIds && cardTypeIds.length > 0) {
      for (const id of cardTypeIds) {
        formData.append('card_type_ids', id)
      }
    } else if (viewMode === 'sets' && setIds && setIds.length > 0) {
      for (const id of setIds) {
        formData.append('set_ids', id)
      }
    }

    formData.append('template', template)
    formData.append('placeholders', placeholders.toString())
    formData.append('view_mode', viewMode)

    const response = await fetch(`${API_BASE_URL}/generate-pdf`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await handleApiError(response)
      throw new Error(error.message)
    }

    return await response.blob()
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(getNetworkErrorMessage())
    }
    throw new Error(getErrorMessage(error))
  }
}
