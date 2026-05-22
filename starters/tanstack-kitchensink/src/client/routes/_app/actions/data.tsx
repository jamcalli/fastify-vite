import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_app/actions/data')({
  // fetchQuery + staleTime: 0 so the counter is fresh per visit
  loader: ({ context }) =>
    context.queryClient.fetchQuery({
      queryKey: ['counter'],
      queryFn: fetchCounter,
      staleTime: 0,
    }),
  component: ActionData,
})

async function fetchCounter() {
  const res = await fetch('/api/counter')
  return res.json() as Promise<{ counter: number }>
}

function ActionData() {
  const { data } = useSuspenseQuery({
    queryKey: ['counter'],
    queryFn: fetchCounter,
  })
  const [counter, setCounter] = useState(data.counter)
  const incrementCounter = async () => {
    const next = await fetchCounter()
    setCounter(next.counter)
  }
  return (
    <>
      <h1>Using inline server GET handler</h1>
      <p>
        <code>useSuspenseQuery</code> reads the counter the loader fetched during SSR; the button
        does a fresh fetch and stores the result in local state.
      </p>
      <p>Counter: {counter}</p>
      <input type="button" value="Increment" onClick={incrementCounter} />
      <p>
        <Link to="/">Go back to the index</Link>
      </p>
    </>
  )
}
