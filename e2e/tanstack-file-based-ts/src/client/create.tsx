import { applyPrimedQueries } from '@fastify/tanstack'
import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import type { FastifyRequest } from 'fastify'
import { sessionQueryKey } from './lib/auth.ts'
import { routeTree } from './routes.ts'
import './types.ts'

// Called on every SSR request and once at hydration
export function createAppRouter(req?: FastifyRequest) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: Number.POSITIVE_INFINITY },
    },
  })

  // Seed session resolved by _auth.server.ts
  if (req && 'ssrSession' in req) {
    queryClient.setQueryData(sessionQueryKey, req.ssrSession ?? null)
  }
  applyPrimedQueries(req, queryClient)

  const router = createRouter({
    routeTree,
    context: { queryClient },
  })
  return routerWithQueryClient(router, queryClient)
}
