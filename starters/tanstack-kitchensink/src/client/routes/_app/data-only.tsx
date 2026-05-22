import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/data-only')({
  ssr: 'data-only',
  loader: () => ({ serverTime: new Date().toISOString() }),
  component: DataOnly,
})

function DataOnly() {
  const { serverTime } = Route.useLoaderData()
  return (
    <>
      <p>
        This route's loader runs on the server; the component itself renders only on the client.
      </p>
      <p>
        Server timestamp captured before SSR: <code>{serverTime}</code>
      </p>
      <p>
        <Link to="/">Go back to the index</Link>
      </p>
      <p>⁂</p>
      <p>
        With <code>ssr: 'data-only'</code>, TanStack runs <code>beforeLoad</code> and{' '}
        <code>loader</code> server-side so data is primed for instant hydration, but the component
        renders only on the client. Useful when a component has browser-only deps you don't want in
        the SSR bundle.
      </p>
      <p>
        See <code>curl http://localhost:3000/data-only</code> — the body is empty (no rendered
        component) but the dehydrated loader data is in the page.
      </p>
    </>
  )
}
