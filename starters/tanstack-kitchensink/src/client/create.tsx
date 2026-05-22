import { applyPrimedQueries } from '@fastify/tanstack/prime-query'
import { createRouter } from '@tanstack/react-router'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import type { FastifyRequest } from 'fastify'
import { createQueryClient } from './lib/queryClient.ts'
import { routeTree } from './routes.ts'
import type { RouterContext, Theme } from './types/router.ts'

// Mirrors what __root.server.ts reads server-side, so client and server context agree
function detectClientTheme(): Theme {
  if (typeof document === 'undefined') return 'dark'
  return /(?:^|; )theme=light/.test(document.cookie) ? 'light' : 'dark'
}

// Called per SSR request on the server and once at hydration on the client
export function createAppRouter(req?: FastifyRequest) {
  const queryClient = createQueryClient()
  applyPrimedQueries(req, queryClient)
  const fetchImpl = globalThis.fetch.bind(globalThis)
  const router = createRouter({
    routeTree,
    defaultNotFoundComponent: () => <p>Not found</p>,
    context: {
      queryClient,
      fetch: fetchImpl,
      theme: req?.ssrTheme ?? detectClientTheme(),
    } satisfies RouterContext,
  })
  return routerWithQueryClient(router, queryClient)
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
