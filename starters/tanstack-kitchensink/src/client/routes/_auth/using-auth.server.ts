import { primeQuery } from '@fastify/tanstack/prime-query'
import type { FastifyInstance } from 'fastify'

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (req) => {
    primeQuery(req, { queryKey: ['todoList'] }, fastify.db.todoList)
  })
}
