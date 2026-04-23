import { createAppRouter } from '$app/create.tsx'
import { buildRoutes } from '@fastify/tanstack/build-routes'

// Auto-discover `.server.{ts,tsx,js,jsx}` siblings under `/routes/` (Vite root)
const serverConfigModules = import.meta.glob('/routes/**/*.server.{ts,tsx,js,jsx}')

export { createAppRouter }

export async function getRoutes() {
  const resolved: Record<string, unknown> = {}
  await Promise.all(
    Object.entries(serverConfigModules).map(async ([key, load]) => {
      resolved[key] = await load()
    }),
  )
  return buildRoutes(createAppRouter(), resolved)
}
