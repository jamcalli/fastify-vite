// Vendored from @tanstack/start-plugin-core@1.171.17 (MIT, Copyright (c) 2021-present Tanner Linsley).
// Source: https://github.com/TanStack/router/blob/757d43375fabe6c181176284a70139cd56fcfa22/packages/start-plugin-core/src/types.ts (subset)
// See ./LICENSE and ./README.md.

export interface NormalizedClientChunk {
  fileName: string
  isEntry: boolean
  imports: Array<string>
  dynamicImports: Array<string>
  css: Array<string>
  routeFilePaths: Array<string>
  hydrationIds: Array<string>
}

export interface NormalizedClientBuild {
  entryChunkFileName: string
  chunksByFileName: ReadonlyMap<string, NormalizedClientChunk>
  chunkFileNamesByRouteFilePath: ReadonlyMap<string, ReadonlyArray<string>>
  cssFilesBySourcePath: ReadonlyMap<string, ReadonlyArray<string>>
  cssContentByFileName?: ReadonlyMap<string, string>
}
