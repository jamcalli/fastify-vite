export { prepareServer } from './server.ts'

export { prepareClient, createRouteHandler, createErrorHandler, createRoute } from './routing.ts'

export { createRenderFunction, createHtmlFunction } from './rendering.ts'

export { buildRoutes, normalizeConfigKey } from './build-routes.ts'
export type { ResolvedRoute } from './build-routes.ts'

export { primeQuery, applyPrimedQueries } from './prime-query.ts'
export type { SsrQueryCacheEntry } from './prime-query.ts'

export const clientModule = '$app/index.ts'
