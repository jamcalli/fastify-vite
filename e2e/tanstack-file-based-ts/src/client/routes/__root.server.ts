import type { FastifyInstance } from 'fastify'

// App-wide hooks; cascadeHooks applies this plugin to every descendant route
export const cascadeHooks = true

export default async function (fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (_req, reply) => {
    reply.header('X-Powered-By', '@fastify/tanstack')
  })
  fastify.addHook('onSend', async (_req, reply, payload) => {
    reply.header('X-Frame-Options', 'DENY')
    return payload
  })
  fastify.addHook('preHandler', async (_req, reply) => {
    reply.header('X-Root-Prehandler', 'ran')
  })
}
