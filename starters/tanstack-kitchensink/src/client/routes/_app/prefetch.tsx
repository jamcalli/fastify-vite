import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import type { MouseEvent } from 'react'

export const Route = createFileRoute('/_app/prefetch')({
  head: () => ({ meta: [{ title: 'Per-Link Prefetch' }] }),
  component: Prefetch,
})

function Prefetch() {
  const router = useRouter()
  // Fresh bust per click so neither the match cache nor the preload cache can serve a hit
  const goCold = (e: MouseEvent) => {
    e.preventDefault()
    router.navigate({ to: '/prefetch-target', search: { bust: Date.now() } })
  }
  return (
    <>
      <h1>Per-Link Prefetch on Hover</h1>
      <p>The target's loader sleeps 1.5s. Open the Network tab and try each link.</p>
      <ul>
        <li>
          <Link to="/prefetch-target" preload="intent">
            With <code>preload="intent"</code>
          </Link>
          : hover, wait ~2s, then click. The loader runs on hover, so the click is instant.
        </li>
        <li>
          <Link to="/prefetch-target" preload={false} onClick={goCold}>
            Without preload
          </Link>
          : click directly. The pending component shows until the loader resolves.
        </li>
      </ul>
      <p>
        <Link to="/">Go back to the index</Link>
      </p>
      <p>⁂</p>
      <p>
        The "without preload" click navigates with a fresh <code>?bust=</code> search param, so each
        visit is a new match the cache has never seen, even if the other link's preload warmed it.
      </p>
      <p>
        The route's JS chunk preload comes from <code>manifest.json</code>, built by the vendored
        TanStack manifest builder. <code>defaultPreload</code> is unset so each{' '}
        <code>{`<Link preload>`}</code> opts in explicitly.
      </p>
    </>
  )
}
