import { resolve } from 'node:path'
import viteFastifyTanstack from '@fastify/tanstack/plugin'
import { tanstackRouter } from '@fastify/tanstack/router-plugin'

export default {
  root: resolve(import.meta.dirname, 'src', 'client'),
  plugins: [tanstackRouter({ autoCodeSplitting: true }), viteFastifyTanstack()],
  build: {
    emptyOutDir: true,
    outDir: resolve(import.meta.dirname, 'build'),
  },
}
