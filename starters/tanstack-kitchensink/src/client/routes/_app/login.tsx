import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { authenticate } from '../../lib/auth.ts'

export const Route = createFileRoute('/_app/login')({
  head: () => ({ meta: [{ title: 'Login' }] }),
  // Falls back to / when ?redirect= is missing or non-string
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : '/',
  }),
  component: Login,
})

function Login() {
  const { redirect } = Route.useSearch()
  const queryClient = useQueryClient()
  const router = useRouter()
  const handleLogin = async () => {
    await authenticate(queryClient)
    router.navigate({ to: redirect })
  }
  return (
    <>
      <h1>Login</h1>
      <p>
        You'll be redirected to <code>{redirect}</code> after authenticating.
      </p>
      <p>
        <input type="button" value="Click to authenticate" onClick={handleLogin} />
      </p>
      <p>
        <Link to="/">Go back to the index</Link>
      </p>
      <p>⁂</p>
      <p>
        <code>validateSearch</code> types the <code>?redirect=</code> param.{' '}
        <Link to="/admin">/admin</Link> throws <code>redirect()</code> from <code>beforeLoad</code>{' '}
        to send unauthenticated requests here.
      </p>
    </>
  )
}
