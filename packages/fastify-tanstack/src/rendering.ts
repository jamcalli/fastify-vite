import { PassThrough } from 'node:stream'
import { createElement } from 'react'
import { createRequire } from 'node:module'

// Bun's react-dom/server shim only activates through require(), not ESM import.
// Without this, renderToPipeableStream silently uses the wrong implementation.
const _require = createRequire(import.meta.url)
const { renderToPipeableStream } = _require(
  'react-dom/server.node',
) as typeof import('react-dom/server')
type PipeableStream = ReturnType<typeof renderToPipeableStream>
import { createMemoryHistory } from '@tanstack/history'
import { RouterProvider } from '@tanstack/react-router'
import type { AnyRouter, AnyRedirect, Manifest } from '@tanstack/router-core'
import {
  attachRouterServerSsrUtils,
  transformPipeableStreamWithRouter,
} from '@tanstack/router-core/ssr/server'
import { mergeHeaders } from '@tanstack/router-core/ssr/client'
import type { RuntimeConfig } from '@fastify/vite'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

interface RenderResult {
  pipeable: PipeableStream | null
  router: AnyRouter
  redirect?: AnyRedirect
}

export async function createRenderFunction(client: Record<string, unknown>) {
  const createAppRouter = client.createAppRouter as (req?: FastifyRequest) => AnyRouter
  const manifest = client._manifest as Manifest | undefined
  // Registered as reply.render()
  return async function (this: FastifyReply): Promise<RenderResult> {
    const url = this.request.url
    const router = createAppRouter(this.request)

    attachRouterServerSsrUtils({ router, manifest, includeUnmatchedRouteAssets: false })

    const history = createMemoryHistory({ initialEntries: [url] })
    router.update({ history })

    await router.load()

    const pendingRedirect = router.stores.redirect.get()
    if (pendingRedirect) {
      return { pipeable: null, router, redirect: pendingRedirect }
    }

    await router.serverSsr?.dehydrate()

    const app = createElement(RouterProvider, { router })

    const pipeable = await new Promise<PipeableStream>((resolve, reject) => {
      try {
        const stream = renderToPipeableStream(app, {
          progressiveChunkSize: Number.POSITIVE_INFINITY,
          onShellReady() {
            resolve(stream)
          },
          onShellError: reject,
          onError(error: unknown) {
            console.error('SSR streaming error:', error)
          },
        })
      } catch (error) {
        reject(error)
      }
    })

    return { pipeable, router }
  }
}

type HtmlFunction = (this: FastifyReply) => FastifyReply | Promise<FastifyReply>

// The return value of this function gets registered as reply.html()
export async function createHtmlFunction(
  _source: string,
  _: FastifyInstance,
  config: RuntimeConfig,
): Promise<HtmlFunction> {
  // Root owns the document via shellComponent; stream React output directly
  return async function (this: FastifyReply) {
    const {
      pipeable,
      router,
      redirect: pendingRedirect,
    } = (await this.render()) as unknown as RenderResult

    if (pendingRedirect) {
      const resolved = router.resolveRedirect(pendingRedirect)
      const href = resolved.headers.get('Location') ?? '/'
      this.code(resolved.status)
      this.redirect(href)
      return this
    }

    const statusCode = router.stores.statusCode.get()
    this.code(statusCode)
    this.type('text/html')

    applyMatchHeaders(this, router)

    if (!pipeable) {
      this.send('')
      return this
    }

    const reactOut = new PassThrough()
    pipeable.pipe(reactOut)
    const transformed = transformPipeableStreamWithRouter(router, reactOut)

    if (config.dev) {
      const checker = new PassThrough()
      let sawBarrier = false
      checker.on('data', (chunk: Buffer) => {
        if (!sawBarrier && chunk.toString().includes('$tsr-stream-barrier')) {
          sawBarrier = true
        }
      })
      checker.on('end', () => {
        if (!sawBarrier) {
          console.warn(
            '[@fastify/tanstack] <Scripts> not found in rendered output. ' +
              'Dehydration will fail. Ensure root route renders <Scripts>.',
          )
        }
      })
      transformed.pipe(checker)
    }

    this.send(transformed)
    return this
  }
}

// Applies per-route `headers()` from resolved match state
function applyMatchHeaders(reply: FastifyReply, router: AnyRouter) {
  const matchHeaders = router.stores.matches.get().map((match) => match.headers)
  const merged = mergeHeaders(...matchHeaders)
  const setCookies = merged.getSetCookie?.() ?? []

  for (const [key, value] of merged) {
    const lower = key.toLowerCase()
    if (lower === 'content-type') continue
    if (lower === 'set-cookie') continue
    reply.header(key, value)
  }

  for (const cookie of setCookies) {
    reply.header('set-cookie', cookie)
  }
}
