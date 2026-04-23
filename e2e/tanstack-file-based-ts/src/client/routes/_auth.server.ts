import { primeQuery } from '@fastify/tanstack/prime-query'
import type { FastifyInstance } from 'fastify'
import { sessionQueryKey } from '../lib/auth.ts'

// Pathless _auth layout; cascade guards every child route under /_auth
export const cascadeHooks = true

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (req, reply) => {
    const session = req.cookies.session ? { user: req.cookies.session } : null
    if (!session) {
      return reply.redirect('/login?redirect=' + encodeURIComponent(req.url))
    }
    primeQuery(req, { queryKey: sessionQueryKey }, session)
    reply.header('X-Auth-Prehandler', 'ran')
  })
}
