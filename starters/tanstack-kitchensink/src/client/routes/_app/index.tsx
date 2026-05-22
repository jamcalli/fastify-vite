import { createFileRoute, Link } from '@tanstack/react-router'
import logo from '/assets/logo.svg'

export const Route = createFileRoute('/_app/')({
  component: Index,
})

function Index() {
  return (
    <>
      <img src={logo} alt="logo" />
      <h1>Welcome to @fastify/tanstack!</h1>
      <ul className="columns-2">
        <li>
          <Link to="/using-data">/using-data</Link> — isomorphic data fetching.
        </li>
        <li>
          <Link to="/using-store">/using-store</Link> — shared TanStack Query cache.
        </li>
        <li>
          <Link to="/using-auth">/using-auth</Link> — <b>custom layout</b>.
        </li>
        <li>
          <Link to="/using-theme">/using-theme</Link> — SSR request state in router context.
        </li>
        <li>
          <Link to="/admin">/admin</Link> — <code>beforeLoad</code> + <code>throw redirect()</code>.
        </li>
        <li>
          <Link to="/login" search={{ redirect: '/admin' }}>
            /login
          </Link>{' '}
          — typed search params via <code>validateSearch</code>.
        </li>
        <li>
          <Link to="/prefetch">/prefetch</Link> — per-link hover prefetch via{' '}
          <code>preload="intent"</code>.
        </li>
        <li>
          <Link to="/form/$id" params={{ id: '123' }}>
            /form/123
          </Link>{' '}
          — <code>POST</code> to dynamic route.
        </li>
        <li>
          <Link to="/actions/data">/actions/data</Link> — inline <code>GET</code> handler.
        </li>
        <li>
          <Link to="/actions/form">/actions/form</Link> — inline <code>POST</code> handler.
        </li>
        <li>
          <Link to="/client-only">/client-only</Link> — <b>disabling</b> SSR.
        </li>
        <li>
          <Link to="/data-only">/data-only</Link> — loader on server, render on client.
        </li>
        <li>
          <Link to="/streaming">/streaming</Link> — <b>streaming</b> SSR.
        </li>
        <li>
          <Link to="/wildcard/$" params={{ _splat: 'another/one' }}>
            /wildcard/another/one
          </Link>{' '}
          — <b>wildcard route matching</b> <code>/wildcard/*</code>
        </li>
      </ul>
    </>
  )
}
