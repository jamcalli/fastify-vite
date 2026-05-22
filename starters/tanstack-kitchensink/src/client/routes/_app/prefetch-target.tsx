import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_app/prefetch-target')({
  head: () => ({ meta: [{ title: 'Prefetch Target' }] }),
  // Optional bust param lets the prefetch demo force a fresh match per click
  validateSearch: (search: Record<string, unknown>) => ({
    bust: typeof search.bust === 'number' ? search.bust : undefined,
  }),
  loaderDeps: ({ search }) => ({ bust: search.bust }),
  loader: async ({ context }) => {
    const res = await context.fetch('/api/slow-resource')
    return res.json() as Promise<{ value: string }>
  },
  pendingComponent: () => <p>Loading slow resource…</p>,
  pendingMs: 0,
  component: PrefetchTarget,
})

function PrefetchTarget() {
  const data = Route.useLoaderData()
  // Format after mount to avoid an SSR/client locale hydration mismatch
  const [display, setDisplay] = useState(data.value)
  useEffect(() => {
    setDisplay(new Date(data.value).toLocaleString())
  }, [data.value])
  return (
    <>
      <h1>Prefetch Target</h1>
      <p>
        Resolved at: <code>{display}</code>
      </p>
      <p>
        <Link to="/prefetch">Go back to the prefetch demo</Link>
      </p>
    </>
  )
}
