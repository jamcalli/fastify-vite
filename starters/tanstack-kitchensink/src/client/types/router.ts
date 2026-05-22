import type { QueryClient } from '@tanstack/react-query'

export type Theme = 'light' | 'dark'

export interface RouterContext {
  queryClient: QueryClient
  fetch: typeof fetch
  theme: Theme
}
