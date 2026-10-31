import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '../demo/errors'

/**
 * Server-state cache. Catalog data is cached aggressively (staleTime) and re-validated in the
 * background; failures retry with exponential backoff + jitter, except when offline.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 15 * 60_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => (isApiError(err) ? err.retryable && count < 2 : count < 1),
      retryDelay: (attempt) => Math.min(4000, 400 * 2 ** attempt) * (0.7 + Math.random() * 0.6),
      networkMode: 'online',
    },
    mutations: {
      retry: false,
      networkMode: 'online',
    },
  },
})
