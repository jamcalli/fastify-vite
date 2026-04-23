import { createElement } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [{ title: 'About' }],
  }),
  component: function About() {
    return createElement(
      'section',
      null,
      createElement('h1', null, 'About'),
      createElement('p', null, 'File-based example for @fastify/tanstack.'),
    )
  },
})
