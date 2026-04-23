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
import { DEV_STYLES_ATTR } from '@tanstack/router-core'
import type { AnyRouter, AnyRedirect, ManifestRouteAssets } from '@tanstack/router-core'
import { isbot } from 'isbot'
import {
  attachRouterServerSsrUtils,
  transformPipeableStreamWithRouter,
} from '@tanstack/router-core/ssr/server'
import { mergeHeaders } from '@tanstack/router-core/ssr/client'
import { text } from 'node:stream/consumers'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type {
  HtmlFunction,
  RenderFunction,
  RenderResult as ViteRenderResult,
  RuntimeConfig,
} from '@fastify/vite'
import type { RenderMode } from './build-routes.ts'
import { inlineScriptHashes, rewriteScriptSrc, sanitizeInlineScripts } from './csp.ts'
import { buildDevStylesHref } from './dev-manifest.ts'
import type { TanStackClient } from './routing.ts'

interface RenderResult extends ViteRenderResult {
  reactOut: PassThrough | null
  router: AnyRouter
  redirect?: AnyRedirect
}

export async function createRenderFunction(
  client: TanStackClient,
  _scope: FastifyInstance,
  config: RuntimeConfig,
): Promise<RenderFunction> {
  const { createAppRouter } = client
  const baseManifest = client._manifest
  const isDev = !!config?.dev
  // Registered as reply.render()
  return async function (this: FastifyReply): Promise<RenderResult> {
    const url = this.request.url
    const router = createAppRouter(this.request)
    try {
      attachRouterServerSsrUtils({
        router,
        manifest: baseManifest,
        // Per-request dev-styles link so first paint has matched-route CSS
        getRequestAssets: isDev ? () => devStylesAssets(router) : undefined,
      })

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
        resolveRenderMode(this.request) === 'stream' && !isbot(this.request.headers['user-agent'])

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

// The return value of this function gets registered as reply.html()
export async function createHtmlFunction(
  _source: string,
  _scope: FastifyInstance,
  _config: RuntimeConfig,
): Promise<HtmlFunction> {
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

    if (resolveRenderMode(this.request) === 'buffered') {
      const html = sanitizeInlineScripts(await text(transformed))
      applyScriptHashes(this, html)
      this.send(html)
      return this
    }

    this.send(transformed)
    return this
  }
}

function resolveRenderMode(request: FastifyRequest): RenderMode {
  return request.routeOptions.config?.render ?? 'stream'
}

// Rewrites an existing CSP header only; policy ownership stays with the app
function applyScriptHashes(reply: FastifyReply, html: string) {
  const header = reply.getHeader('content-security-policy')
  if (typeof header !== 'string' || header.length === 0) return
  reply.header('content-security-policy', rewriteScriptSrc(header, inlineScriptHashes(html)))
}

// Called after router.load() via the router.ssr.manifest getter
function devStylesAssets(router: AnyRouter): ManifestRouteAssets | undefined {
  const ids = router.stores.matches.get().map((match) => match.routeId)
  if (ids.length === 0) return undefined
  return { css: [{ href: buildDevStylesHref(ids), [DEV_STYLES_ATTR]: true }] }
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
