import { primeQuery } from '@fastify/tanstack'
import type { FastifyInstance } from 'fastify'
import { loadPost, postQueryOptions } from '../../services/posts.ts'

export default async function (fastify: FastifyInstance) {
  fastify.addHook<{ Params: { id: string } }>('preHandler', async (req) => {
    const post = await loadPost(req.params.id)
    primeQuery(req, postQueryOptions(req.params.id), post)
  })
}
