import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import type { PropsWithChildren } from 'react'
import type { RouterContext } from '../types/router.ts'

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Welcome to @fastify/tanstack!' },
    ],
    links: [{ rel: 'stylesheet', href: '/base.css' }],
  }),
  // shellComponent owns the document so SSR streams a full <html> tree
  shellComponent: function RootDocument({ children }: PropsWithChildren) {
    return (
      <html lang="en">
        <head>
          <HeadContent />
        </head>
        <body>
          <div id="root">{children}</div>
          <Scripts />
        </body>
      </html>
    )
  },
  component: Outlet,
})
