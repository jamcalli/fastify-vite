import type { FastifyInstance } from 'fastify'

export default async function (fastify: FastifyInstance) {
  fastify.post<{ Body: { username: string } }>('/api/admin-check', async (req, reply) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    if (req.body.username === 'admin') {
      return reply.redirect('/admin')
    }
    return new Error('Invalid username')
  })
}
