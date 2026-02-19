import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getApiSetsApiSetsGetQueryKey } from './api/queries/default/default'
import { SET_ICONS_QUERY_KEY } from './hooks/useSetIcons'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary.tsx'
import './index.css'

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
  prefetch.sets.then((data) => {
    if (data && !queryClient.getQueryData(getApiSetsApiSetsGetQueryKey())) {
      queryClient.setQueryData(getApiSetsApiSetsGetQueryKey(), {
        data,
        status: 200,
        headers: new Headers(),
      })
    }
  })
}

if (prefetch?.setIcons) {
  prefetch.setIcons.then((data) => {
    if (data && !queryClient.getQueryData(SET_ICONS_QUERY_KEY)) {
      queryClient.setQueryData(SET_ICONS_QUERY_KEY, data)
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)
