import { primeQuery } from '@fastify/tanstack/prime-query'
import type { FastifyInstance } from 'fastify'

// Scoped to the _app subtree; primes for every route under it
export const cascadeHooks = true

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (req) => {
    primeQuery(req, { queryKey: ['todoList'] }, fastify.db.todoList)
  })
}
