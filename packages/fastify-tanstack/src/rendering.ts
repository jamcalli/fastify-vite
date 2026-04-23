import { PassThrough } from 'node:stream'
import { createElement } from 'react'
import { createRequire } from 'node:module'

// Bun's react-dom/server shim only activates through require(), not ESM import.
// Without this, renderToPipeableStream silently uses the wrong implementation.
const _require = createRequire(import.meta.url)
const { renderToPipeableStream } = _require(
  'react-dom/server.node',
) as typeof import('react-dom/server')
import { createMemoryHistory } from '@tanstack/history'
import { RouterProvider } from '@tanstack/react-router'
import { rootRouteId } from '@tanstack/router-core'
import type { AnyRoute, AnyRouter, AnyRedirect, Manifest } from '@tanstack/router-core'
import { isbot } from 'isbot'
import {
  attachRouterServerSsrUtils,
  transformPipeableStreamWithRouter,
} from '@tanstack/router-core/ssr/server'
import { mergeHeaders } from '@tanstack/router-core/ssr/client'
import type { FastifyInstance, FastifyReply } from 'fastify'
import type { RuntimeConfig } from '@fastify/vite'
import { buildDevStylesHref } from './dev-manifest.ts'
import type { TanStackClient } from './routing.ts'

interface RenderResult {
  reactOut: PassThrough | null
  router: AnyRouter
  redirect?: AnyRedirect
  [key: string]: unknown
}

export async function createRenderFunction(
  client: TanStackClient,
  _scope: FastifyInstance,
  config: RuntimeConfig,
) {
  const { createAppRouter } = client
  const baseManifest = client._manifest
  const isDev = !!config?.dev
  // Registered as reply.render()
  return async function (this: FastifyReply): Promise<RenderResult> {
    const url = this.request.url
    const router = createAppRouter(this.request)
    try {
      // Per-request dev-styles link so first paint has matched-route CSS
      const manifest =
        isDev && baseManifest ? withDevStylesLink(baseManifest, router, url) : baseManifest
      attachRouterServerSsrUtils({ router, manifest, includeUnmatchedRouteAssets: false })

      const history = createMemoryHistory({ initialEntries: [url] })
      const origin = `${this.request.protocol}://${this.request.host}`
      router.update({ history, origin: router.options.origin ?? origin })

      await router.load()

      const pendingRedirect = router.stores.redirect.get()
      if (pendingRedirect) {
        return { reactOut: null, router, redirect: pendingRedirect }
      }

      await router.serverSsr?.dehydrate()

      const app = createElement(RouterProvider, { router })

      const reactOut = new PassThrough()
      // Bots get the full tree so crawlers don't index the shell-only HTML
      const streaming =
        (this.request.routeOptions as { streaming?: boolean })?.streaming === true &&
        !isbot(this.request.headers['user-agent'])

      await new Promise<void>((resolve, reject) => {
        try {
          const stream = renderToPipeableStream(app, {
            nonce: router.options.ssr?.nonce,
            // Mirror upstream; progressive flushing can split the script-barrier marker the transform scans for
            progressiveChunkSize: Number.POSITIVE_INFINITY,
            ...(streaming
              ? {
                  onShellReady() {
                    stream.pipe(reactOut)
                    resolve()
                  },
                }
              : {
                  onAllReady() {
                    stream.pipe(reactOut)
                    resolve()
                  },
                }),
            onShellError: reject,
            // Destroy on error so the transform errors immediately instead of hitting its 60s timeout
            onError(error: unknown) {
              console.error('SSR render error:', error)
              if (!reactOut.destroyed) {
                reactOut.destroy(error instanceof Error ? error : new Error(String(error)))
              }
            },
          })
        } catch (error) {
          reject(error)
        }
      })

      return { reactOut, router }
    } catch (err) {
      router.serverSsr?.cleanup()
      throw err
    }
  }
}

type HtmlFunction = (this: FastifyReply) => FastifyReply | Promise<FastifyReply>

// The return value of this function gets registered as reply.html()
export async function createHtmlFunction(): Promise<HtmlFunction> {
  // Root owns the document via shellComponent; stream React output directly
  return async function (this: FastifyReply) {
    const {
      reactOut,
      router,
      redirect: pendingRedirect,
    } = (await this.render()) as unknown as RenderResult

    if (pendingRedirect) {
      const resolved = router.resolveRedirect(pendingRedirect)
      const href = resolved.headers.get('Location') ?? '/'
      this.redirect(href, resolved.status)
      router.serverSsr?.cleanup()
      return this
    }

    const statusCode = router.stores.statusCode.get()
    this.code(statusCode)
    this.type('text/html')

    applyMatchHeaders(this, router)

    if (!reactOut) {
      this.send('')
      router.serverSsr?.cleanup()
      return this
    }

    // transformPipeableStreamWithRouter calls router.serverSsr.cleanup() on stream end
    const transformed = transformPipeableStreamWithRouter(router, reactOut)

    this.send(transformed)
    return this
  }
}

function withDevStylesLink(manifest: Manifest, router: AnyRouter, url: string): Manifest {
  const pathname = url.split('?')[0] ?? '/'
  const { matchedRoutes } = router.getMatchedRoutes(pathname)
  const ids = (matchedRoutes as Array<AnyRoute>).map((r) => r.id)
  if (ids.length === 0) return manifest
  const root = manifest.routes[rootRouteId] ?? {}
  return {
    ...manifest,
    routes: {
      ...manifest.routes,
      [rootRouteId]: {
        ...root,
        assets: [
          ...(root.assets ?? []),
          {
            tag: 'link',
            attrs: { rel: 'stylesheet', href: buildDevStylesHref(ids) },
          },
        ],
      },
    },
  }
}

// Applies per-route `headers()` from resolved match state
function applyMatchHeaders(reply: FastifyReply, router: AnyRouter) {
  const matchHeaders = router.stores.matches.get().map((match) => match.headers)
  const merged = mergeHeaders(...matchHeaders)

  for (const [key, value] of merged) {
    if (key === 'content-type') continue
    if (key === 'set-cookie') continue
    reply.header(key, value)
  }

  const setCookies = merged.getSetCookie()
  if (setCookies.length) reply.header('set-cookie', setCookies)
}
