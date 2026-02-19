import { useQuery } from '@tanstack/react-query'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://mtg-labels.fly.dev'

export const SET_ICONS_QUERY_KEY = ['set-icons'] as const

async function fetchSetIcons(): Promise<Record<string, string>> {
  const response = await fetch(`${API_BASE_URL}/api/set-icons`)
  if (!response.ok) return {}
  return response.json()
}

export function useSetIcons() {
  return useQuery({
    queryKey: SET_ICONS_QUERY_KEY,
    queryFn: fetchSetIcons,
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}
