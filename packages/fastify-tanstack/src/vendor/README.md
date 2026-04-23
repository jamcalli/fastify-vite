# Vendored TanStack code

Files in this directory are copied from [`@tanstack/start-plugin-core`](https://github.com/TanStack/router/tree/main/packages/start-plugin-core) (MIT, copyright Tanner Linsley). The upstream package does not export the manifest builder, and deep imports are blocked by `"exports"` gating.

**Pinned:** `@tanstack/start-plugin-core@1.167.35` ([commit `0166fe8`](https://github.com/TanStack/router/tree/0166fe8ba0f3492f26d32eeb50548beae6641a07))

## Source mapping

| File here | Upstream source |
|---|---|
| `manifest-builder.ts` | [`.../start-manifest-plugin/manifestBuilder.ts`](https://github.com/TanStack/router/blob/0166fe8ba0f3492f26d32eeb50548beae6641a07/packages/start-plugin-core/src/start-manifest-plugin/manifestBuilder.ts) |
| `normalized-client-build.ts` | [`.../vite/start-manifest-plugin/normalized-client-build.ts`](https://github.com/TanStack/router/blob/0166fe8ba0f3492f26d32eeb50548beae6641a07/packages/start-plugin-core/src/vite/start-manifest-plugin/normalized-client-build.ts) |
| `routes-manifest-plugin.ts` | [`.../start-router-plugin/generator-plugins/routes-manifest-plugin.ts`](https://github.com/TanStack/router/blob/0166fe8ba0f3492f26d32eeb50548beae6641a07/packages/start-plugin-core/src/start-router-plugin/generator-plugins/routes-manifest-plugin.ts) |
| `types.ts` | Subset of [`.../src/types.ts`](https://github.com/TanStack/router/blob/0166fe8ba0f3492f26d32eeb50548beae6641a07/packages/start-plugin-core/src/types.ts) |

## Local modifications

**`manifest-builder.ts`**
- Import paths rewritten for the local layout
- `serializeStartManifest` function and `seroval` import removed
- `ufo.joinURL(base, fileName)` replaced with `base + fileName`

**`normalized-client-build.ts`**
- Import paths rewritten for the local layout
- `tsrSplit = 'tsr-split'` inlined from `@tanstack/router-plugin/src/core/constants.ts`

**`routes-manifest-plugin.ts`**
- `GeneratorPlugin` and `RouteTreeNode` interfaces inlined from `@tanstack/router-generator/src/plugin/types.ts`
- `declare global { var TSS_ROUTES_MANIFEST: ... }` inlined from upstream's `global.d.ts`
- Inline record type changed from `children: Array<string>` to `children?: Array<string>`
- JSDoc replaced with single-line comment

**`types.ts`**
- Only `NormalizedClientChunk` and `NormalizedClientBuild` interfaces extracted

## Resyncing

1. Update the pinned version, commit SHA, and URL anchors above
2. `npm pack @tanstack/start-plugin-core@<version>` and diff against this directory
3. Reapply the local modifications
4. Update the per-file `// Source:` headers

The `vendor/` directory is excluded from `oxlint` and `oxfmt` so upstream formatting is preserved.

## License

See `LICENSE`. Upstream: https://github.com/TanStack/router
