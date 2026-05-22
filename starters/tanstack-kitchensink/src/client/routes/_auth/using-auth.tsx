import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { sendJSON } from '../../lib/fetch.ts'

export const Route = createFileRoute('/_auth/using-auth')({
  head: () => ({ meta: [{ title: 'Using Custom Layout' }] }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ['todoList'],
      queryFn: fetchTodoList,
    }),
  component: UsingAuth,
})

async function fetchTodoList(): Promise<string[]> {
  const res = await fetch('/api/todo/items')
  return res.json()
}

function UsingAuth() {
  const queryClient = useQueryClient()
  const { data: todoList } = useSuspenseQuery({
    queryKey: ['todoList'],
    queryFn: fetchTodoList,
  })
  const [input, setInput] = useState<HTMLInputElement | null>(null)
  const addItem = useMutation({
    mutationFn: (item: string) => sendJSON('/api/todo/items', { method: 'PUT', json: item }),
    onSuccess: (_res, item) => {
      queryClient.setQueryData<string[]>(['todoList'], (prev = []) => [...prev, item])
      if (input) input.value = ''
    },
  })
  return (
    <>
      <h2>Todo List — Using Custom Layout</h2>
      <ul>
        {todoList.map((item, i) => (
          <li key={`item-${i}`}>{item}</li>
        ))}
      </ul>
      <div>
        <input ref={setInput} />
        <button onClick={() => input && addItem.mutate(input.value)}>Add</button>
      </div>
      <p>
        <Link to="/">Go back to the index</Link>
      </p>
      <p>⁂</p>
      <p>
        This example is exactly the same as <Link to="/using-store">/using-store</Link>, except it's
        wrapped in a custom layout which blocks it until the authenticated flag is set in the shared
        QueryClient cache.
      </p>
    </>
  )
}
