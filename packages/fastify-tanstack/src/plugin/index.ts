import viteFastify from '@fastify/vite/plugin'
import type { Plugin, ResolvedConfig, UserConfig } from 'vite'
import {
  prefix,
  resolveId,
  loadSource,
  loadVirtualModule,
  createPlaceholderExports,
} from './virtual.ts'
import { captureClientBundle, closeBundle as closeBundleImpl } from './preload.ts'

interface PluginContext {
  root: string
  resolvedConfig: ResolvedConfig | null
}

export default function viteFastifyTanstackPlugin(): Plugin[] {
  const context: PluginContext = {
    root: '',
    resolvedConfig: null,
  }
  return [
    viteFastify({
      clientModule: '$app/index.ts',
    }),
    {
      name: 'vite-plugin-tanstack-fastify',
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
      generateBundle: {
        order: 'post',
        handler(_options, bundle) {
          captureClientBundle.call(this, bundle)
        },
      },
      async closeBundle() {
        await closeBundleImpl.call(this)
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
