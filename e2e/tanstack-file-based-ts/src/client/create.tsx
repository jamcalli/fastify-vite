import { applyPrimedQueries } from '@fastify/tanstack/prime-query'
import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import type { FastifyRequest } from 'fastify'
import { routeTree } from './routes.ts'

// Called on every SSR request and once at hydration
export function createAppRouter(req?: FastifyRequest) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: Number.POSITIVE_INFINITY },
    },
  })

  applyPrimedQueries(req, queryClient)

  const router = createRouter({
    routeTree,
    context: { queryClient },
  })
  return routerWithQueryClient(router, queryClient)
}
