import { createElement } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: function Index() {
    return createElement('h1', null, 'Hello from TanStack file-based routing!')
  },
})
