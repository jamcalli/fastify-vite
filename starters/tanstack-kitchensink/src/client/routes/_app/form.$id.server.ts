import { primeQuery } from '@fastify/tanstack/prime-query'
import type { FastifyInstance } from 'fastify'

// Routes are GET-only by default; this opts in to POST too
export const routeOptions = { method: ['GET', 'POST'] as const }

export default async function (fastify: FastifyInstance) {
  fastify.addHook<{ Params: { id: string }; Body: { number?: string } }>(
    'preHandler',
    async (req, reply) => {
      if (req.method !== 'POST') return
      if (req.body?.number !== '42') return reply.redirect('/')
      primeQuery(req, { queryKey: ['form', req.params.id] }, req.body)
    },
  )
}
