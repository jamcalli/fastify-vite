import { createElement } from 'react'
import { createRootRoute, createRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import type { PropsWithChildren } from 'react'

const rootRoute = createRootRoute({
  shellComponent: function RootDocument({ children }: PropsWithChildren) {
    return createElement(
      'html',
      { lang: 'en' },
      createElement('head', null, createElement(HeadContent)),
      createElement('body', null, children, createElement(Scripts)),
    )
  },
  component: Outlet,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: function Index() {
    return createElement('h1', null, 'Hello from TanStack Router SSR!')
  },
})

export const routeTree = rootRoute.addChildren([indexRoute])
