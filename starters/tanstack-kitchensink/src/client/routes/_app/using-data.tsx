import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_app/using-data')({
  head: () => ({ meta: [{ title: 'Todo List — Using Data' }] }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ['todoList'],
      queryFn: fetchTodoList,
    }),
  // Surfaces while the loader is pending on client-side navigation
  pendingComponent: () => <p>Loading todo list…</p>,
  pendingMs: 0,
  errorComponent: ({ error }) => <p>Failed to load: {error.message}</p>,
  component: UsingData,
})

async function fetchTodoList(): Promise<string[]> {
  const res = await fetch('/api/todo/items')
  return res.json()
}

function UsingData() {
  const { data: todoList } = useSuspenseQuery({
    queryKey: ['todoList'],
    queryFn: fetchTodoList,
  })
  // useState forks the cache so additions stay local to this route's lifetime
  const [items, setItems] = useState(todoList)
  const [input, setInput] = useState<HTMLInputElement | null>(null)
  const addItem = (value: string) => {
    setItems((list) => [...list, value])
    if (input) input.value = ''
  }
  return (
    <>
      <h2>Todo List — Using Data</h2>
      <ul>
        {items.map((item, i) => (
          <li key={`item-${i}`}>{item}</li>
        ))}
      </ul>
      <div>
        <input ref={setInput} />
        <button onClick={() => input && addItem(input.value)}>Add</button>
      </div>
      <p>
        <Link to="/">Go back to the index</Link>
      </p>
      <p>⁂</p>
      <p>
        When you navigate away from this route, any additions to the to-do list will be lost,
        because they're bound to this route component only.
      </p>
      <p>
        See the <Link to="/using-store">/using-store</Link> example to learn how to use the shared
        QueryClient cache for it.
      </p>
    </>
  )
}
