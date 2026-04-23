import viteFastify from '@fastify/vite/plugin'
import type { Plugin, ResolvedConfig, UserConfig } from 'vite'
import {
  prefix,
  resolveId,
  loadSource,
  loadVirtualModule,
  createPlaceholderExports,
} from './virtual.ts'
import {
  captureClientBundle,
  closeBundle as closeBundleImpl,
  type PreloadState,
} from './preload.ts'
import {
  CSS_MODULES_REGEX,
  collectDevStyles,
  normalizeCssModuleCacheKey,
} from '../vendor/dev-styles.ts'
import { DEV_STYLES_PATH } from '../dev-manifest.ts'

interface PluginContext extends PreloadState {
  root: string
  resolvedConfig: ResolvedConfig | null
}

export default function viteFastifyTanstackPlugin(): Plugin[] {
  const context: PluginContext = {
    root: '',
    resolvedConfig: null,
  }
  const cssModulesCache: Record<string, string> = {}
  return [
    viteFastify({
      clientModule: '$app/index.ts',
    }),
    {
      name: 'vite-plugin-tanstack-fastify',
      // Shared instance across envs so client generateBundle's capture survives to ssr closeBundle
      sharedDuringBuild: true,
      config: configHook,
      configResolved: configResolved.bind(context),
      resolveId: resolveId.bind(context),
      async load(id) {
        if (id.includes('?server') && !this.environment.config.build?.ssr) {
          const source = loadSource(id)
          return createPlaceholderExports(source)
        }
        if (id.includes('?client') && this.environment.config.build?.ssr) {
          const source = loadSource(id)
          return createPlaceholderExports(source)
        }
        if (prefix.test(id)) {
          const [, virtual] = id.split(prefix)
          if (virtual) {
            return loadVirtualModule(virtual)
          }
        }
      },
      // Capture raw CSS modules content; Vite's transform output wraps it in JS
      transform: {
        filter: { id: CSS_MODULES_REGEX },
        handler(code, id) {
          cssModulesCache[normalizeCssModuleCacheKey(id)] = code
        },
      },
      configureServer(viteDevServer) {
        viteDevServer.middlewares.use(async (req, res, next) => {
          const url = req.url ?? ''
          const pathname = url.split('?')[0]
          if (!pathname?.endsWith(DEV_STYLES_PATH)) {
            return next()
          }
          try {
            const urlObj = new URL(url, 'http://localhost')
            const routesParam = urlObj.searchParams.get('routes')
            const routeIds = routesParam ? routesParam.split(',') : []

            const entries: Array<string> = []
            const routesManifest = globalThis.TSS_ROUTES_MANIFEST
            if (routesManifest && routeIds.length > 0) {
              for (const routeId of routeIds) {
                const route = routesManifest[routeId]
                if (route?.filePath) {
                  entries.push(route.filePath)
                }
              }
            }

            const css =
              entries.length > 0
                ? await collectDevStyles({
                    viteDevServer,
                    entries,
                    cssModulesCache,
                  })
                : undefined

            res.setHeader('Content-Type', 'text/css')
            res.setHeader('Cache-Control', 'no-store')
            res.end(css ?? '')
          } catch (e) {
            console.error('[fastify-tanstack] Error collecting dev styles:', e)
            res.setHeader('Content-Type', 'text/css')
            res.setHeader('Cache-Control', 'no-store')
            res.end(`/* Error collecting styles: ${e instanceof Error ? e.message : String(e)} */`)
          }
        })
      },
      generateBundle: {
        order: 'post',
        handler(_options, bundle) {
          captureClientBundle.call(this, context, bundle)
        },
      },
      async closeBundle() {
        await closeBundleImpl.call(this, context)
      },
    },
  ]
}

function configResolved(this: PluginContext, config: ResolvedConfig) {
  this.resolvedConfig = config
  this.root = config.root
}

function configHook(config: UserConfig, { command }: { command: string }) {
  if (command === 'build') {
    if (!config.build) {
      config.build = {}
    }
    if (!config.build.rollupOptions) {
      config.build.rollupOptions = {}
    }
    config.build.rollupOptions.onwarn = onwarn
  }
}

type OnwarnFn = NonNullable<NonNullable<UserConfig['build']>['rollupOptions']>['onwarn']

const onwarn: OnwarnFn = (warning, defaultHandler) => {
  if (
    !(
      warning.code === 'PLUGIN_WARNING' &&
      warning.message?.includes?.('dynamic import will not move module into another chunk')
    )
  ) {
    defaultHandler(warning)
  }
}
