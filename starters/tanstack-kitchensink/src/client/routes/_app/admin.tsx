import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { authQueryKey, logout } from '../../lib/auth.ts'

export const Route = createFileRoute('/_app/admin')({
  head: () => ({ meta: [{ title: 'Admin' }] }),
  // beforeLoad runs on server and client; auth flag is primed in __root.server.ts
  beforeLoad: ({ context, location }) => {
    const authed = context.queryClient.getQueryData<boolean>(authQueryKey)
    if (!authed) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: Admin,
})

function Admin() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const handleLogout = async () => {
    await logout(queryClient)
    // invalidate re-runs beforeLoad, which now redirects
    await router.invalidate()
  }
  return (
    <>
      <h1>Admin</h1>
      <p>You are authenticated.</p>
      <p>
        <input type="button" value="Log out" onClick={handleLogout} />
      </p>
      <p>
        <Link to="/">Go back to the index</Link>
      </p>
    </>
  )
}
