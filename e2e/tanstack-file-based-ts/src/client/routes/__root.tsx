import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import type { PropsWithChildren } from 'react'

// Declared here so file-based routes pick up context.* via the generated route tree
export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
  }),
  // Paired with the "Broken link" in the nav below to exercise the 404 path
  notFoundComponent: function NotFound() {
    return (
      <section>
        <h1>404 - Not Found</h1>
        <p>No route matched this URL.</p>
        <Link to="/">Go home</Link>
      </section>
    )
  },
  shellComponent: function RootDocument({ children }: PropsWithChildren) {
    return (
      <html lang="en">
        <head>
          <HeadContent />
        </head>
        <body>
          <nav>
            <Link to="/" style={{ marginRight: 12 }}>
              Home
            </Link>
            <Link to="/about" style={{ marginRight: 12 }}>
              About
            </Link>
            <Link to="/posts/$id" params={{ id: '1' }} style={{ marginRight: 12 }}>
              Post 1
            </Link>
            <Link to="/dashboard" style={{ marginRight: 12 }}>
              Dashboard
            </Link>
            {/* Plain <a> since <Link to> is typed against the generated route tree */}
            <a href="/does-not-exist">Broken link</a>
          </nav>
          {children}
          <Scripts />
        </body>
      </html>
    )
  },
  component: Outlet,
})
