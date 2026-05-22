import { primeQuery } from '@fastify/tanstack/prime-query'
import type { FastifyInstance } from 'fastify'
import { authQueryKey } from '../lib/auth.ts'
import type { Theme } from '../types/router.ts'

// create.tsx reads req.ssrTheme into the router context
declare module 'fastify' {
  interface FastifyRequest {
    ssrTheme?: Theme
  }
}

// App-wide cookie-derived SSR state
export const cascadeHooks = true

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (req) => {
    req.ssrTheme = req.cookies.theme === 'light' ? 'light' : 'dark'
    primeQuery(req, { queryKey: authQueryKey }, !!req.cookies.session)
  })
}
