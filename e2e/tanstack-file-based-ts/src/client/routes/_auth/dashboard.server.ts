import type { FastifyInstance } from 'fastify'

// Route-level hook; runs after the cascading __root and _auth preHandlers
export default async function (fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (_req, reply) => {
    reply.header('X-Dashboard-Prehandler', 'ran')
  })
}
