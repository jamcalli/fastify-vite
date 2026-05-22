import { resolve } from 'node:path'
import Fastify from 'fastify'
import FastifyVite from '@fastify/vite'
import FastifyFormBody from '@fastify/formbody'
import FastifyCookie from '@fastify/cookie'
import * as renderer from '@fastify/tanstack'

declare module 'fastify' {
  interface FastifyInstance {
    db: { todoList: string[] }
  }
}

const server = Fastify({
  logger: {
    transport: { target: '@fastify/one-line-logger' },
  },
})

await server.register(FastifyCookie)
await server.register(FastifyFormBody)

server.decorate('db', {
  todoList: ['Do laundry', 'Respond to emails', 'Write report'],
})

server.get('/api/todo/items', () => server.db.todoList)

server.put<{ Body: string }>('/api/todo/items', (req, reply) => {
  server.db.todoList.push(req.body)
  reply.send({ ok: true })
})

server.delete<{ Body: number }>('/api/todo/items', (req, reply) => {
  server.db.todoList.splice(req.body, 1)
  reply.send({ ok: true })
})

// Cookie lets __root.server.ts prime the authenticated flag on next SSR
server.post('/api/authenticate', (_req, reply) => {
  reply.setCookie('session', '1', { path: '/', httpOnly: true, sameSite: 'lax' })
  return { ok: true }
})

server.post('/api/logout', (_req, reply) => {
  reply.clearCookie('session', { path: '/' })
  return { ok: true }
})

// Backs the streaming.tsx loader; slow on purpose so onShellReady fires before this resolves
server.get('/api/streaming-message', async () => {
  await new Promise((resolve) => setTimeout(resolve, 5000))
  return { message: 'Delayed by Suspense API' }
})

// Backs prefetch-target.tsx; slow on purpose
server.get('/api/slow-resource', async () => {
  await new Promise((resolve) => setTimeout(resolve, 1500))
  return { value: new Date().toISOString() }
})

await server.register(FastifyVite, {
  root: resolve(import.meta.dirname, '..'),
  dev: process.argv.includes('--dev'),
  renderer,
})

await server.vite.ready()
await server.listen({ port: 3005 })
