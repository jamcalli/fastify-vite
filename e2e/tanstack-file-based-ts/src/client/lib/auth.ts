import { queryOptions } from '@tanstack/react-query'
import type { SsrSession } from '../types.ts'

export const sessionQueryKey = ['session'] as const

export function sessionQueryOptions(fetchImpl: typeof fetch) {
  return queryOptions({
    queryKey: sessionQueryKey,
    queryFn: async (): Promise<SsrSession | null> => {
      const res = await fetchImpl('/api/get-session')
      if (!res.ok) return null
      return res.json()
    },
    // Flushed by explicit invalidation on logout
    staleTime: Number.POSITIVE_INFINITY,
  })
}
