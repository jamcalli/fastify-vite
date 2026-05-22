import { Await, createFileRoute, Link } from '@tanstack/react-router'
import { Suspense } from 'react'

export const Route = createFileRoute('/_app/streaming')({
  // Returning an unawaited promise lets onShellReady flush before the fetch resolves
  loader: ({ context }) => ({
    message: context
      .fetch('/api/streaming-message')
      .then((res) => res.json())
      .then((data: { message: string }) => data.message),
  }),
  component: Streaming,
})

function Streaming() {
  const { message } = Route.useLoaderData()
  return (
    <>
      <Suspense fallback={<p>Waiting for content</p>}>
        <Await promise={message}>{(value) => <p>{value}</p>}</Await>
      </Suspense>
      <p>
        <Link to="/">Go back to the index</Link>
      </p>
    </>
  )
}
