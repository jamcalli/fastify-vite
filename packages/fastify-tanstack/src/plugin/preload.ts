import { dirname, isAbsolute, join } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import type { Rollup } from 'vite'
import { rootRouteId } from '@tanstack/router-core'
import { buildStartManifest } from '../vendor/manifest-builder.ts'
import { normalizeViteClientBuild } from '../vendor/normalized-client-build.ts'
import type { NormalizedClientBuild } from '../vendor/types.ts'

interface RollupHookContext {
  environment: {
    name: string
    config: {
      base: string
      root: string
      build: { outDir: string }
    }
  }
  warn: (message: string) => void
  error: (message: string) => never
}

export interface PreloadState {
  capturedClientBuild?: NormalizedClientBuild
}

// Client env's generateBundle hook (enforce post)
export function captureClientBundle(
  this: RollupHookContext,
  state: PreloadState,
  bundle: Rollup.OutputBundle,
) {
  if (this.environment.name !== 'client') return
  state.capturedClientBuild = normalizeViteClientBuild(bundle)
}

// Written in ssr closeBundle; client's emptyOutDir wipes it otherwise
export async function closeBundle(this: RollupHookContext, state: PreloadState) {
  if (this.environment.name !== 'ssr') return
  if (!state.capturedClientBuild) {
    this.error(
      'client build was not captured before ssr closeBundle; ' +
        'plugin instance must be shared across client and ssr envs',
    )
  }

  const routeTreeRoutes = globalThis.TSS_ROUTES_MANIFEST
  if (!routeTreeRoutes) {
    // Code-split chunks without a per-route manifest lose their preload hints
    const hasSplitRoutes = Array.from(state.capturedClientBuild.chunksByFileName.values()).some(
      (chunk) => chunk.routeFilePaths.length > 0,
    )
    if (hasSplitRoutes) {
      this.warn(
        'TSS_ROUTES_MANIFEST is not defined; per-route preloads will be missing. ' +
          'Import tanstackRouter from "@fastify/tanstack/router-plugin" ' +
          '(which wires the required routes-manifest generator plugin) ' +
          'instead of from "@tanstack/router-plugin/vite".',
      )
    }
  }

  // Root-only fallback for code-based routing
  const effectiveRouteTree = routeTreeRoutes ?? {
    [rootRouteId]: { filePath: '', children: [] },
  }

  const { root, base } = this.environment.config
  const clientOutDir = isAbsolute(this.environment.config.build.outDir)
    ? this.environment.config.build.outDir
    : join(root, this.environment.config.build.outDir)
  const ssrOutDir = join(dirname(clientOutDir), 'server')

  const manifest = buildStartManifest({
    clientBuild: state.capturedClientBuild,
    routeTreeRoutes: effectiveRouteTree,
    basePath: base || '/',
  })

  // Client entry script asset on root so <Scripts /> emits it
  const rootRoute = (manifest.routes[rootRouteId] = manifest.routes[rootRouteId] || {})
  rootRoute.assets = rootRoute.assets || []
  rootRoute.assets.push({
    tag: 'script',
    attrs: { type: 'module', async: true },
    children: `import(${JSON.stringify(manifest.clientEntry)})`,
  })

  mkdirSync(ssrOutDir, { recursive: true })
  writeFileSync(join(ssrOutDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
}
