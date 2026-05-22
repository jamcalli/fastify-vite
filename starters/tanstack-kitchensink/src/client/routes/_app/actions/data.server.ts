import type { FastifyInstance } from 'fastify'

let counter = 0

export default async function (fastify: FastifyInstance) {
  fastify.get('/api/counter', () => ({ counter: ++counter }))
}
