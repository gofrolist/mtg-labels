import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getApiSetsApiSetsGetQueryKey } from './api/queries/default/default'
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
const prefetchedSets = (window as unknown as { __prefetch?: { sets?: Promise<unknown[] | null> } })
  .__prefetch?.sets
if (prefetchedSets) {
  prefetchedSets.then((data) => {
    if (data && !queryClient.getQueryData(getApiSetsApiSetsGetQueryKey())) {
      queryClient.setQueryData(getApiSetsApiSetsGetQueryKey(), {
        data,
        status: 200,
        headers: new Headers(),
      })
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
