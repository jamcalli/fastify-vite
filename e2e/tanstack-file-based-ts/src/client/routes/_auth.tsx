import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { sessionQueryOptions } from '../lib/auth.ts'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    // SSR hits the cache primed by _auth.server.ts; client nav fetches /api/get-session
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions(globalThis.fetch))
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { session }
  },
  component: function AuthLayout() {
    return <Outlet />
  },
})
