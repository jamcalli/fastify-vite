import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse } from 'node-html-parser'
import { rootRouteId } from '@tanstack/router-core'
import type { Manifest, RouterManagedTag } from '@tanstack/router-core'
import type { ViteDevServer } from 'vite'

export const DEV_STYLES_PATH = '/@fastify-tanstack/dev-styles.css'

export function buildDevStylesHref(routeIds: ReadonlyArray<string>): string {
  return `${DEV_STYLES_PATH}?routes=${encodeURIComponent(routeIds.join(','))}`
}

// Dev counterpart to the vendored manifest-builder; <Scripts /> renders the result
export async function buildDevManifest(devServer: ViteDevServer): Promise<Manifest> {
  const indexHtmlPath = join(devServer.config.root, 'index.html')
  const indexHtml = await readFile(indexHtmlPath, 'utf8')
  const transformed = await devServer.transformIndexHtml('/', indexHtml)
  return {
    routes: { [rootRouteId]: { assets: extractScriptTags(transformed) } },
  }
}

function extractScriptTags(html: string): RouterManagedTag[] {
  return parse(html)
    .querySelectorAll('script')
    .map((el) => {
      const attrs = { ...el.attributes }
      const content = el.innerHTML
      return content.trim() ? { tag: 'script', attrs, children: content } : { tag: 'script', attrs }
    })
}
