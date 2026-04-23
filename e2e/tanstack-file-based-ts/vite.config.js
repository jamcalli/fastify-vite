import { resolve } from 'node:path'
import viteFastifyTanstack from '@fastify/tanstack/plugin'
import { tanstackRouter } from '@fastify/tanstack/router-plugin'

export default {
  root: resolve(import.meta.dirname, 'src', 'client'),
  plugins: [
    // Watches src/client/routes and (re)generates routeTree.gen.ts
    tanstackRouter({
      autoCodeSplitting: true,
    }),
    // Wires the TanStack renderer into Vite's SSR pipeline for @fastify/vite
    viteFastifyTanstack(),
  ],
  build: {
    emptyOutDir: true,
    outDir: resolve(import.meta.dirname, 'build'),
  },
}
