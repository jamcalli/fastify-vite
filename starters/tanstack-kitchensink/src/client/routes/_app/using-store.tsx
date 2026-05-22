import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { sendJSON } from '../../lib/fetch.ts'

export const Route = createFileRoute('/_app/using-store')({
  head: () => ({ meta: [{ title: 'Todo List — Using Store' }] }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ['todoList'],
      queryFn: fetchTodoList,
    }),
  component: UsingStore,
})

async function fetchTodoList(): Promise<string[]> {
  const res = await fetch('/api/todo/items')
  return res.json()
}

function UsingStore() {
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
      <h2>Todo List — Using Store</h2>
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
        When you navigate away from this route, any additions to the to-do list are not lost,
        because they're bound to the shared QueryClient cache.
      </p>
    </>
  )
}
