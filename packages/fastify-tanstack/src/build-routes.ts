import type { FastifyPluginAsync } from 'fastify'

type RoutePlugin = FastifyPluginAsync

interface ResolvedSibling {
  plugin: RoutePlugin
  cascadeHooks: boolean
}

export interface ResolvedRoute {
  path: string
  name: string
  ancestorPlugins: RoutePlugin[]
  ownPlugin?: RoutePlugin
}

interface AnyNode {
  id: string
  path?: string
  fullPath: string
  children?: AnyNode[]
}

interface AnyRouterLike {
  routeTree: AnyNode
  routesByPath: Record<string, AnyNode>
}

// Maps a `.server.{ext}` glob key to the matching TanStack route id
export function normalizeConfigKey(globKey: string, routesDir = 'routes'): string | null {
  let k = globKey.replace(/^(\.?\/)+/, '')
  const prefix = routesDir.replace(/^(\.?\/)+|\/+$/g, '') + '/'
  if (!k.startsWith(prefix)) return null
  k = k.slice(prefix.length)
  const stripped = k.replace(/\.server\.(tsx?|jsx?)$/, '')
  if (stripped === k) return null
  const segments = stripped.split('/').flatMap((seg) => seg.split('.'))
  // Root-level index.tsx has id '/'
  if (segments.length === 1 && segments[0] === 'index') return '/'
  // __root.tsx generates the sentinel route id `__root__`
  if (segments.length === 1 && segments[0] === '__root') return '__root__'
  // Trailing index maps to the parent segment
  if (segments[segments.length - 1] === 'index') segments.pop()
  return '/' + segments.join('/')
}

export function buildRoutes(
  router: AnyRouterLike,
  rawSiblings: Record<string, unknown> = {},
  options: { routesDir?: string } = {},
): ResolvedRoute[] {
  const siblingsById = resolveSiblings(rawSiblings, options.routesDir)
  const consumedIds = new Set<string>()
  const emitted: ResolvedRoute[] = []
  const routesByPath = router.routesByPath

  const visit = (node: AnyNode, ancestorStack: RoutePlugin[]) => {
    const sibling = siblingsById.get(node.id)
    // routesByPath is keyed by fullPath and excludes pathless layouts
    const isEmitted = routesByPath[node.fullPath] === node

    if (sibling && !sibling.cascadeHooks && !isEmitted) {
      throw new Error(
        `Sibling for pathless/layout route "${node.id}" does not set cascadeHooks; its hooks can never fire. Add \`export const cascadeHooks = true\` or remove the file.`,
      )
    }

    if (sibling) consumedIds.add(node.id)

    // Own sibling applies to this route's emission; cascadeHooks extends to descendants
    const descendantStack = sibling?.cascadeHooks
      ? [...ancestorStack, sibling.plugin]
      : ancestorStack

    if (isEmitted) {
      emitted.push({
        path: node.fullPath,
        name: node.id,
        ancestorPlugins: ancestorStack,
        ownPlugin: sibling?.plugin,
      })
    }

    for (const child of node.children ?? []) visit(child, descendantStack)
  }
  visit(router.routeTree, [])

  // Dangling siblings: filename pointed at a route id that isn't in the tree
  for (const id of siblingsById.keys()) {
    if (!consumedIds.has(id)) {
      throw new Error(
        `Sibling for route id "${id}" did not resolve to any known route. Check the filename.`,
      )
    }
  }

  return emitted
}

function resolveSiblings(
  rawSiblings: Record<string, unknown>,
  routesDir = 'routes',
): Map<string, ResolvedSibling> {
  const map = new Map<string, ResolvedSibling>()
  for (const [key, mod] of Object.entries(rawSiblings)) {
    const routeId = normalizeConfigKey(key, routesDir)
    if (!routeId) {
      throw new Error(`${key} is not a valid sibling path under "${routesDir}/"`)
    }
    map.set(routeId, extractSibling(mod, key))
  }
  return map
}

const skipOverride = Symbol.for('skip-override')

function extractSibling(mod: unknown, filename: string): ResolvedSibling {
  if (!mod || typeof mod !== 'object') {
    throw new Error(`${filename} did not export a module`)
  }
  const record = mod as Record<string, unknown>
  const raw = record.default
  if (typeof raw !== 'function') {
    throw new Error(`${filename} must export a default Fastify plugin function`)
  }
  // Without skip-override, scope.register() would isolate the plugin's hooks in a child
  // scope the route isn't in, and they would silently never fire
  const plugin = raw as RoutePlugin & { [skipOverride]?: boolean }
  plugin[skipOverride] = true
  return {
    plugin,
    cascadeHooks: record.cascadeHooks === true,
  }
}
