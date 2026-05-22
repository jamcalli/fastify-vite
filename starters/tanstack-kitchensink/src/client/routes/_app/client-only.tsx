import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/client-only')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Client Only Page' }] }),
  component: ClientOnly,
})

function ClientOnly() {
  return (
    <>
      <p>This route is rendered on the client only!</p>
      <p>
        <Link to="/">Go back to the index</Link>
      </p>
      <p>⁂</p>
      <p>When this route is rendered on the server, no SSR takes place.</p>
      <p>
        See the output of <code>curl http://localhost:3000/client-only</code>.
      </p>
    </>
  )
}
