import type { FastifyRequest } from 'fastify'

export interface SsrQueryCacheEntry {
  queryKey: readonly unknown[]
  data: unknown
}

declare module 'fastify' {
  interface FastifyRequest {
    ssrQueryCache?: SsrQueryCacheEntry[]
  }
}

interface QueryClientLike {
  setQueryData(queryKey: readonly unknown[], data: unknown): unknown
}

// Seeds the SSR query cache from a *.server.ts preHandler
export function primeQuery(
  request: FastifyRequest,
  options: { queryKey: readonly unknown[] },
  data: unknown,
): void {
  request.ssrQueryCache ??= []
  request.ssrQueryCache.push({ queryKey: options.queryKey, data })
}

// Drains the SSR query cache into the QueryClient
export function applyPrimedQueries(
  request: FastifyRequest | undefined,
  queryClient: QueryClientLike,
): void {
  for (const entry of request?.ssrQueryCache ?? []) {
    queryClient.setQueryData(entry.queryKey, entry.data)
  }
}
