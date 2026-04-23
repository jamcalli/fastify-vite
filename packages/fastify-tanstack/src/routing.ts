import { readFileSync, existsSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  RouteOptions,
} from 'fastify'
import type { AnyRouter } from '@tanstack/router-core'
import type {
  ClientEntries,
  ClientModule,
  CreateRouteArgs,
  RouteDefinition,
  RuntimeConfig,
} from '@fastify/vite'
import { buildDevManifest } from './dev-manifest.ts'
import type { SiblingRouteOptions } from './build-routes.ts'
import { translateRoutePath } from './translate-path.ts'

interface TanStackRoute extends RouteDefinition {
  path: string
  name?: string
  ancestorPlugins?: FastifyPluginAsync[]
  ownPlugin?: FastifyPluginAsync
}

export type CreateAppRouter = (req?: FastifyRequest) => AnyRouter
export type GetRoutes = () => TanStackRoute[] | Promise<TanStackRoute[]>

export interface TanStackClient extends ClientModule {
  createAppRouter: CreateAppRouter
  getRoutes?: GetRoutes
  routes?: TanStackRoute[]
  _manifest?: import('@tanstack/router-core').ServerManifest
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
    throw new Error('createAppRouter must be a function exported from $app/index.ts')
  }
  if (client.getRoutes !== undefined && typeof client.getRoutes !== 'function') {
    throw new Error('getRoutes must be a function (or omitted) on $app/index.ts')
  }

  if (typeof client.getRoutes === 'function') {
    const routes = await client.getRoutes()
    // Without a catch-all, unmatched URLs hit Fastify's 404 instead of TanStack's notFoundComponent
    const hasCatchAll = routes.some((r) => r.path === '/$' || r.path === '*' || r.path === '/*')
    if (!hasCatchAll) {
      routes.push({ path: '/*' })
    }
    return { ...client, routes }
  }

  return client
}

function loadManifest(
  config: RuntimeConfig,
): import('@tanstack/router-core').ServerManifest | undefined {
  const ssrOutDir = resolveSsrOutDir(config)
  if (!ssrOutDir) return undefined
  const manifestPath = join(ssrOutDir, 'manifest.json')
  if (!existsSync(manifestPath)) return undefined
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (err) {
    throw new Error(
      `Failed to read or parse route manifest at ${manifestPath}: ${(err as Error).message}`,
    )
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

export function createErrorHandler(_: unknown, scope: FastifyInstance, config: RuntimeConfig) {
  return async (error: Error, req: FastifyRequest, reply: FastifyReply) => {
    req.log.error(error)
    if (config.dev) {
      scope.vite.devServer?.ssrFixStacktrace(error)
      // Lazy so static-import bundlers don't pull youch's CJS into SSR output
      const { default: Youch } = await import('youch')
      const youch = new Youch(error, req.raw)
      reply.code(500)
      reply.type('text/html')
      reply.send(await youch.toHTML())
      return reply
    }
    return scope.errorHandler(error, req, reply)
  }
}

export async function createRoute(
  { handler, errorHandler, route }: CreateRouteArgs,
  scope: FastifyInstance,
  _config: RuntimeConfig,
) {
  if (!route?.path || !handler) return

  const {
    ancestorPlugins = [],
    ownPlugin,
    routeOptions,
  } = route as RouteDefinition & {
    ancestorPlugins?: FastifyPluginAsync[]
    ownPlugin?: FastifyPluginAsync
    routeOptions?: SiblingRouteOptions
  }

  // Throws on untranslatable syntax so cascadeHooks can't be silently bypassed
  const { paths: routePaths } = translateRoutePath(route.path)

  // Per-route scope so sibling plugin hooks do not leak to other routes
  await scope.register(async (innerScope) => {
    for (const plugin of ancestorPlugins) {
      await innerScope.register(plugin)
    }
    if (ownPlugin) {
      await innerScope.register(ownPlugin)
    }
    // request.routeOptions only exposes a fixed property set; custom flags must ride config
    const { render, ...fastifyOptions } = routeOptions ?? {}
    for (const url of routePaths) {
      // Spread before errorHandler/handler so user opts can't clobber renderer wiring
      innerScope.route({
        url,
        method: 'GET',
        ...fastifyOptions,
        config: { ...fastifyOptions.config, render },
        errorHandler,
        handler,
      } as RouteOptions)
    }
  })
}
