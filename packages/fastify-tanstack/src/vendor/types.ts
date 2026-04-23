// Vendored from @tanstack/start-plugin-core@1.167.35 (MIT, Copyright (c) 2021-present Tanner Linsley).
// Source: https://github.com/TanStack/router/blob/0166fe8ba0f3492f26d32eeb50548beae6641a07/packages/start-plugin-core/src/types.ts (subset)
// See ./LICENSE and ./README.md.

export interface NormalizedClientChunk {
  fileName: string
  isEntry: boolean
  imports: Array<string>
  dynamicImports: Array<string>
  css: Array<string>
  routeFilePaths: Array<string>
}

export interface NormalizedClientBuild {
  entryChunkFileName: string
  chunksByFileName: ReadonlyMap<string, NormalizedClientChunk>
  chunkFileNamesByRouteFilePath: ReadonlyMap<string, ReadonlyArray<string>>
  cssFilesBySourcePath: ReadonlyMap<string, ReadonlyArray<string>>
}
