import { resolve } from 'node:path'
import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyFormbody from '@fastify/formbody'
import FastifyVite from '@fastify/vite'
import * as renderer from '@fastify/tanstack'
import { loadPost } from './services/posts.ts'

export async function main(dev?: boolean) {
  const server = Fastify()

  await server.register(fastifyCookie)
  await server.register(fastifyFormbody)

  server.get<{ Params: { id: string } }>('/api/posts/:id', async (req) => {
    return loadPost(req.params.id)
  })

  server.get('/api/get-session', async (req) => {
    if (!req.cookies.session) return null
    return { user: req.cookies.session }
  })

  server.post<{ Body: { username?: string; redirect?: string } }>(
    '/api/login',
    async (req, reply) => {
      const username = req.body?.username?.trim() || 'demo'
      reply.setCookie('session', username, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
      })
      const target = isSafeRedirect(req.body?.redirect) ? req.body.redirect : '/dashboard'
      return reply.redirect(target)
    },
  )

  server.post('/api/logout', async (_req, reply) => {
    reply.clearCookie('session', { path: '/' })
    return reply.redirect('/login')
  })

  await server.register(FastifyVite, {
    root: resolve(import.meta.dirname, '..'),
    dev: dev || process.argv.includes('--dev'),
    renderer,
  })

  await server.vite.ready()
  return server
}

// Open redirect guard: reject '//evil.com' style paths
function isSafeRedirect(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
}

if (process.argv[1] === import.meta.filename) {
  const server = await main()
  await server.listen({ port: 3303 })
}
