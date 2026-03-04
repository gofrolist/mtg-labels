const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://mtg-labels.fly.dev'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function customFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, init)
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: response.statusText }))
    throw new ApiError(response.status, errorBody.detail ?? 'Request failed')
  }

  const data = response.status === 204 ? undefined : await response.json()

  return {
    data,
    status: response.status,
    headers: response.headers,
  } as T
}

interface GeneratePDFOptions {
  setIds?: string[]
  cardTypeIds?: string[]
  template: string
  placeholders: number
  customTemplate?: Record<string, number>
  labelLayout?: Record<string, unknown>
  viewMode: 'sets' | 'types'
}

export async function generatePDF({
  setIds,
  cardTypeIds,
  template,
  placeholders,
  customTemplate,
  labelLayout,
  viewMode,
}: GeneratePDFOptions): Promise<Blob> {
  const formData = new FormData()

  if (viewMode === 'sets' && setIds) {
    for (const id of setIds) {
      formData.append('set_ids', id)
    }
  } else if (viewMode === 'types' && cardTypeIds) {
    for (const id of cardTypeIds) {
      formData.append('card_type_ids', id)
    }
  }

  formData.append('template', template)
  formData.append('placeholders', placeholders.toString())
  formData.append('view_mode', viewMode)

  if (customTemplate) {
    formData.append('custom_template', JSON.stringify(customTemplate))
  }

  if (labelLayout) {
    formData.append('label_layout', JSON.stringify(labelLayout))
  }

  const response = await fetch(`${API_BASE_URL}/generate-pdf`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: response.statusText }))
    throw new ApiError(response.status, errorBody.detail ?? 'Failed to generate PDF')
  }

  return response.blob()
}
