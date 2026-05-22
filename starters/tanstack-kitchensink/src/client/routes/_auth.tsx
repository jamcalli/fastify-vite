import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { authQueryKey, authenticate } from '../lib/auth.ts'

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

function AuthLayout() {
  const queryClient = useQueryClient()
  // Primed value wins; the queryFn is a no-op default when the cache is empty
  const { data: authenticated } = useQuery({
    queryKey: authQueryKey,
    queryFn: () => false,
    staleTime: Number.POSITIVE_INFINITY,
  })
  if (!authenticated) {
    return (
      <>
        <p>This route needs authentication.</p>
        <button onClick={() => authenticate(queryClient)}>
          Click this button to authenticate.
        </button>
      </>
    )
  }
  return <Outlet />
}
