import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getApiSetsApiSetsGetQueryKey } from './api/queries/default/default'
import { SET_ICONS_QUERY_KEY } from './hooks/useSetIcons'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary.tsx'
import { initSentry } from './utils/sentry'
import './index.css'

initSentry()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — sets data rarely changes
      refetchOnWindowFocus: false,
    },
  },
})

// Consume prefetched API data started in index.html (before JS loaded)
const prefetch = (
  window as unknown as {
    __prefetch?: {
      sets?: Promise<unknown[] | null>
      setIcons?: Promise<Record<string, string> | null>
    }
  }
).__prefetch

if (prefetch?.sets) {
  queryClient
    .fetchQuery({
      queryKey: getApiSetsApiSetsGetQueryKey(),
      queryFn: async () => {
        const data = await prefetch.sets
        if (!data) throw new Error('prefetch failed')
        return { data, status: 200, headers: new Headers() }
      },
      retry: false,
    })
    .catch(() => {})
}

if (prefetch?.setIcons) {
  queryClient
    .fetchQuery({
      queryKey: SET_ICONS_QUERY_KEY,
      queryFn: async () => {
        const data = await prefetch.setIcons
        if (!data) throw new Error('prefetch failed')
        return data
      },
      retry: false,
    })
    .catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>
)
