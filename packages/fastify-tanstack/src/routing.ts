import { readFileSync, existsSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import Youch from 'youch'
import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  RouteOptions,
} from 'fastify'
import type { RuntimeConfig, RouteDefinition, ClientEntries, ClientModule } from '@fastify/vite'
import { buildDevManifest } from './dev-manifest.ts'

interface TanStackRoute {
  path: string
  name?: string
  ancestorPlugins?: FastifyPluginAsync[]
  ownPlugin?: FastifyPluginAsync
}

interface TanStackClient extends ClientModule {
  createAppRouter:
    | ((...args: unknown[]) => unknown)
    | Promise<{ createAppRouter?: unknown; default?: unknown }>
  getRoutes?:
    | ((...args: unknown[]) => TanStackRoute[] | Promise<TanStackRoute[]>)
    | Promise<{ getRoutes?: unknown; default?: unknown }>
  routes?: TanStackRoute[]
  _manifest?: import('@tanstack/router-core').Manifest
}

export async function prepareClient(
  entries: ClientEntries,
  scope: FastifyInstance,
  config?: RuntimeConfig,
) {
  const source = entries.ssr as TanStackClient | undefined
  if (!source) return null

  // ESM module namespaces are frozen; spread so we can mutate
  const client: TanStackClient = { ...source }

  if (config?.dev) {
    const devServer = scope.vite.devServer
    if (devServer) {
      client._manifest = await buildDevManifest(devServer)
    }
  } else if (config) {
    client._manifest = loadManifest(config)
  }

  if (typeof client.createAppRouter !== 'function') {
    if (client.createAppRouter instanceof Promise) {
      const mod = (await client.createAppRouter) as Record<string, unknown>
      client.createAppRouter = (mod.createAppRouter ??
        mod.default) as TanStackClient['createAppRouter']
    }
  }
  if (typeof client.getRoutes !== 'function') {
    if (client.getRoutes instanceof Promise) {
      const mod = (await client.getRoutes) as Record<string, unknown>
      client.getRoutes = (mod.getRoutes ?? mod.default) as TanStackClient['getRoutes']
    }
  }

  if (typeof client.getRoutes === 'function') {
    const routes = await client.getRoutes()
    // Without a catch-all, unmatched URLs hit Fastify's default 404
    // instead of TanStack Router's notFoundComponent
    const hasCatchAll = routes.some((r) => r.path === '/$' || r.path === '*' || r.path === '/*')
    if (!hasCatchAll) {
      routes.push({ path: '/*' })
    }
    return { ...client, routes }
  }

  return client
}

function loadManifest(config: RuntimeConfig): import('@tanstack/router-core').Manifest | undefined {
  const ssrOutDir = resolveSsrOutDir(config)
  if (!ssrOutDir) return undefined
  const manifestPath = join(ssrOutDir, 'manifest.json')
  if (!existsSync(manifestPath)) return undefined
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch {
    return undefined
  }
}

function resolveSsrOutDir(config: RuntimeConfig): string | null {
  const fastifyConfig = (config.viteConfig as { fastify?: { outDirs?: Record<string, string> } })
    .fastify
  const ssrOutDir = fastifyConfig?.outDirs?.ssr
  if (ssrOutDir) {
    return isAbsolute(ssrOutDir) ? ssrOutDir : join(config.root, ssrOutDir)
  }
  let distDir = config.viteConfig.build.outDir
  if (!isAbsolute(distDir)) distDir = join(config.viteConfig.root, distDir)
  return join(distDir, '..', 'server')
}

export function createRouteHandler() {
  return (_: FastifyRequest, reply: FastifyReply) => reply.html()
}

export function createErrorHandler(_: unknown, __: FastifyInstance, config: RuntimeConfig) {
  return async (error: Error, req: FastifyRequest, reply: FastifyReply) => {
    req.log.error(error)
    if (config.dev) {
      const youch = new Youch(error, req.raw)
      reply.code(500)
      reply.type('text/html')
      reply.send(await youch.toHTML())
      return reply
    }
    reply.code(500)
    reply.send('')
    return reply
  }
}

export async function createRoute(
  {
    handler,
    errorHandler,
    route,
  }: {
    handler?: RouteOptions['handler']
    errorHandler?: RouteOptions['errorHandler']
    route?: RouteDefinition
  },
  scope: FastifyInstance,
  _config: RuntimeConfig,
) {
  if (!route?.path || !handler) return

  const { ancestorPlugins = [], ownPlugin } = route as RouteDefinition & {
    ancestorPlugins?: FastifyPluginAsync[]
    ownPlugin?: FastifyPluginAsync
  }

  let routePath = route.path.replace(/\$\$/, '*').replace(/\$([a-zA-Z_]\w*)/g, ':$1')
  if (routePath !== '/') {
    routePath = routePath.replace(/\/$/, '')
  }

  // Per-route scope so sibling plugin hooks do not leak to other routes
  await scope.register(async (innerScope) => {
    for (const plugin of ancestorPlugins) {
      await innerScope.register(plugin)
    }
    if (ownPlugin) {
      await innerScope.register(ownPlugin)
    }
    innerScope.route({
      url: routePath,
      method: route.method ?? 'GET',
      errorHandler,
      handler,
    })
  })
}
