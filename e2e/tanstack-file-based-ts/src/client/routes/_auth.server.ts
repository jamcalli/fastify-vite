import type { FastifyInstance } from 'fastify'
import '../types.ts'

// Pathless _auth layout; cascade guards every child route under /_auth
export const cascadeHooks = true

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (req, reply) => {
    const session = req.cookies.session ? { user: req.cookies.session } : null
    // Seeded into the query cache by create.tsx so beforeLoad hits cache
    req.ssrSession = session
    if (!session) {
      return reply.redirect('/login?redirect=' + encodeURIComponent(req.url))
    }
    reply.header('X-Auth-Prehandler', 'ran')
  })
}
