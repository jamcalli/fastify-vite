import { createElement } from 'react'
import { createFileRoute } from '@tanstack/react-router'

// beforeLoad runs on both server and client; the auth gate itself is the
// Fastify preHandler in _auth.server.ts (server-only, pre-SSR)
export const Route = createFileRoute('/_auth/dashboard')({
  head: () => ({
    meta: [{ title: 'Dashboard' }],
  }),
  beforeLoad: () => ({ loadedAt: new Date().toISOString() }),
  component: function Dashboard() {
    const { loadedAt, session } = Route.useRouteContext()
    return createElement(
      'section',
      null,
      createElement('h1', null, 'Dashboard'),
      session && createElement('p', null, `Welcome, ${session.user}`),
      createElement('p', null, `Loaded at ${loadedAt}`),
      createElement(
        'form',
        { action: '/api/logout', method: 'POST' },
        createElement('button', { type: 'submit' }, 'Log out'),
      ),
    )
  },
})
