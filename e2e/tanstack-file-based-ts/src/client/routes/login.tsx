import { createElement } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [{ title: 'Log in' }],
  }),
  component: function Login() {
    const { redirect } = Route.useSearch()
    return createElement(
      'section',
      null,
      createElement('h1', null, 'Log in'),
      createElement(
        'p',
        null,
        'Submitting the form posts to /api/login, which sets the session cookie and redirects to the dashboard. The name you enter becomes the cookie value and is rendered server-side from the router context.',
      ),
      createElement(
        'form',
        { action: '/api/login', method: 'POST' },
        redirect
          ? createElement('input', { type: 'hidden', name: 'redirect', value: redirect })
          : null,
        createElement(
          'label',
          { style: { marginRight: 8 } },
          'Name: ',
          createElement('input', {
            type: 'text',
            name: 'username',
            defaultValue: 'demo',
          }),
        ),
        createElement('button', { type: 'submit' }, 'Log in'),
      ),
    )
  },
})
