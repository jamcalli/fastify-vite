import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { postQueryOptions } from '../../services/posts.ts'

// JSX, not createElement: TanStack <Link> only typechecks `to`/`params` in JSX form

export const Route = createFileRoute('/posts/$id')({
  head: ({ params }) => ({
    meta: [{ title: `Post ${params.id}` }],
  }),
  loader: ({ params, context }) => context.queryClient.prefetchQuery(postQueryOptions(params.id)),
  component: Post,
})

function Post() {
  const { id } = Route.useParams()
  const queryClient = useQueryClient()
  const { data: post } = useQuery(postQueryOptions(id))
  if (!post) return null
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
      <p>
        Loaded at: <code>{post.loadedAt}</code>
      </p>
      <button
        type="button"
        onClick={() => queryClient.invalidateQueries({ queryKey: ['posts', id] })}
      >
        Refetch
      </button>
      <nav style={{ marginTop: 16 }}>
        <Link to="/posts/$id" params={{ id: '1' }} style={{ marginRight: 12 }}>
          Post 1
        </Link>
        <Link to="/posts/$id" params={{ id: '2' }} style={{ marginRight: 12 }}>
          Post 2
        </Link>
        <Link to="/posts/$id" params={{ id: '3' }}>
          Post 3
        </Link>
      </nav>
    </article>
  )
}
