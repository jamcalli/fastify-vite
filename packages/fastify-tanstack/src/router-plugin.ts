import { tanstackRouter as baseRouter } from '@tanstack/router-plugin/vite'
import type { Config } from '@tanstack/router-plugin/vite'
import { routesManifestPlugin } from './vendor/routes-manifest-plugin.ts'

// `.server.*` siblings hold server-only route config; excluded to prevent client-bundle leak
const SERVER_SIBLING_PATTERN = '\\.server\\.(t|j)sx?$'

// Object form only; upstream also accepts () => Config
type BaseTanstackRouterOptions = Partial<Config>
type GeneratorPluginEntry = NonNullable<BaseTanstackRouterOptions['plugins']>[number]

// target is pinned to 'react' because the renderer binds to @tanstack/react-router
type TanstackRouterOptions = Omit<BaseTanstackRouterOptions, 'target'>

// tanstackRouter wrapper with @fastify/tanstack-required defaults
export function tanstackRouter(options: TanstackRouterOptions = {}) {
  const { routeFileIgnorePattern, plugins, ...rest } = options
  const mergedIgnore = routeFileIgnorePattern
    ? `(?:${routeFileIgnorePattern})|(?:${SERVER_SIBLING_PATTERN})`
    : SERVER_SIBLING_PATTERN

  return baseRouter({
    routesDirectory: './routes',
    generatedRouteTree: './routeTree.gen.ts',
    ...rest,
    target: 'react',
    routeFileIgnorePattern: mergedIgnore,
    // Inlined GeneratorPlugin is narrower than upstream's; cast at the boundary
    plugins: [routesManifestPlugin() as unknown as GeneratorPluginEntry, ...(plugins ?? [])],
  })
}
