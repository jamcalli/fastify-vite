// Vendored from @tanstack/start-plugin-core@1.171.17 (MIT, Copyright (c) 2021-present Tanner Linsley).
// Source: https://github.com/TanStack/router/blob/757d43375fabe6c181176284a70139cd56fcfa22/packages/start-plugin-core/src/start-router-plugin/generator-plugins/routes-manifest-plugin.ts
// See ./LICENSE and ./README.md.

import { rootRouteId } from '@tanstack/router-core'

// Local mod: `GeneratorPlugin` type inlined (upstream: @tanstack/router-generator/src/plugin/types.ts)
interface RouteTreeNode {
  routePath: string
  fullPath: string
  children?: RouteTreeNode[]
}
interface GeneratorPlugin {
  name: string
  onRouteTreeChanged?: (opts: {
    routeTree: RouteTreeNode[]
    rootRouteNode: RouteTreeNode
    routeNodes: RouteTreeNode[]
  }) => void
}

declare global {
  var TSS_ROUTES_MANIFEST: Record<
    string,
    { filePath: string; children?: Array<string> }
  >
}

// Builds the routes manifest and stores it on globalThis for the vite plugin
export function routesManifestPlugin(): GeneratorPlugin {
  return {
    name: 'routes-manifest-plugin',
    onRouteTreeChanged: ({ routeTree, rootRouteNode, routeNodes }) => {
      const allChildren = routeTree.map((d) => d.routePath)
      const routes: Record<
        string,
        {
          filePath: string
          children?: Array<string>
        }
      > = {
        [rootRouteId]: {
          filePath: rootRouteNode.fullPath,
          children: allChildren,
        },
        ...Object.fromEntries(
          routeNodes.map((d) => {
            const filePathId = d.routePath

            return [
              filePathId,
              {
                filePath: d.fullPath,
                children: d.children?.map((childRoute) => childRoute.routePath),
              },
            ]
          }),
        ),
      }

      globalThis.TSS_ROUTES_MANIFEST = routes
    },
  }
}
