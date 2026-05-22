import type { QueryClient } from '@tanstack/react-query'
import { sendJSON } from './fetch.ts'

export const authQueryKey = ['authenticated'] as const

// Cookie persists across reloads; setQueryData flips the cache for instant UI
export async function authenticate(queryClient: QueryClient) {
  await sendJSON('/api/authenticate', { method: 'POST' })
  queryClient.setQueryData(authQueryKey, true)
}

export async function logout(queryClient: QueryClient) {
  await sendJSON('/api/logout', { method: 'POST' })
  queryClient.setQueryData(authQueryKey, false)
}
