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

export async function generatePDF(
  setIds: string[],
  template: string,
  placeholders: number,
): Promise<Blob> {
  const formData = new FormData()

  for (const id of setIds) {
    formData.append('set_ids', id)
  }

  formData.append('template', template)
  formData.append('placeholders', placeholders.toString())
  formData.append('view_mode', 'sets')

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
