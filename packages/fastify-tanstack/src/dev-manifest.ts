import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { rootRouteId } from '@tanstack/router-core'
import type { Manifest, RouterManagedTag } from '@tanstack/router-core'
import type { ViteDevServer } from 'vite'

// Dev counterpart to the vendored manifest-builder; <Scripts /> renders the result
// Memoized per devServer; transformIndexHtml output is stable across dev requests
const devManifestCache = new WeakMap<ViteDevServer, Manifest>()

export async function buildDevManifest(devServer: ViteDevServer): Promise<Manifest> {
  const cached = devManifestCache.get(devServer)
  if (cached) return cached

  const indexHtmlPath = join(devServer.config.root, 'index.html')
  const indexHtml = await readFile(indexHtmlPath, 'utf8').catch(
    () => '<html><head></head><body></body></html>',
  )
  const transformed = await devServer.transformIndexHtml('/', indexHtml)
  const manifest: Manifest = {
    routes: { [rootRouteId]: { assets: extractScriptTags(transformed) } },
  }
  devManifestCache.set(devServer, manifest)
  return manifest
}

const SCRIPT_TAG_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
const ATTR_RE = /([a-zA-Z_][\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g

function extractScriptTags(html: string): RouterManagedTag[] {
  const tags: RouterManagedTag[] = []
  let m: RegExpExecArray | null
  SCRIPT_TAG_RE.lastIndex = 0
  while ((m = SCRIPT_TAG_RE.exec(html))) {
    const [, attrStr, content] = m
    const attrs = parseAttrs(attrStr)
    tags.push(
      content.trim() ? { tag: 'script', attrs, children: content } : { tag: 'script', attrs },
    )
  }
  return tags
}

function parseAttrs(src: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  let m: RegExpExecArray | null
  ATTR_RE.lastIndex = 0
  while ((m = ATTR_RE.exec(src))) {
    attrs[m[1]] = m[2] ?? m[3] ?? m[4] ?? ''
  }
  return attrs
}
