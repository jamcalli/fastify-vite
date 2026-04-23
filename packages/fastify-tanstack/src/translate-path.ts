export class UntranslatableRouteError extends Error {
  constructor(originalPath: string, segment: string, reason: string) {
    super(`Cannot register TanStack route "${originalPath}": segment "${segment}" ${reason}.`)
    this.name = 'UntranslatableRouteError'
  }
}

export interface TranslatedPath {
  paths: string[]
}

const PARAM_NAME_RE = /^[a-zA-Z_]\w*$/

// Translates a TanStack route path to one or more find-my-way paths
export function translateRoutePath(tanstackPath: string): TranslatedPath {
  if (tanstackPath === '/' || !tanstackPath.includes('$')) {
    return { paths: [normalize(tanstackPath)] }
  }

  const rawSegments = tanstackPath.split('/')
  const isAbsolute = rawSegments[0] === ''
  const segments = (isAbsolute ? rawSegments.slice(1) : rawSegments).filter((s) => s !== '')

  let variants: string[][] = [[]]

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const isLast = i === segments.length - 1
    const result = translateSegment(seg, { isLast, originalPath: tanstackPath })

    if (result.kind === 'append') {
      variants = variants.map((v) => [...v, result.value])
    } else {
      variants = variants.flatMap((v) => [[...v, result.withParam], [...v]])
    }
  }

  const paths = Array.from(new Set(variants.map((parts) => '/' + parts.join('/')).map(normalize)))
  return { paths }
}

function normalize(path: string): string {
  if (path === '' || path === '/') return '/'
  return path.replace(/\/+$/, '')
}

type SegmentResult =
  | { kind: 'append'; value: string }
  | { kind: 'optional-pair'; withParam: string }

// Mirrors parseSegment in @tanstack/router-core/new-process-route-tree.ts
function translateSegment(
  seg: string,
  ctx: { isLast: boolean; originalPath: string },
): SegmentResult {
  if (!seg.includes('$')) {
    return { kind: 'append', value: seg }
  }

  if (seg === '$') {
    if (!ctx.isLast) {
      throw new UntranslatableRouteError(ctx.originalPath, seg, 'splat must be the last segment')
    }
    return { kind: 'append', value: '*' }
  }

  if (seg.charCodeAt(0) === 36 && !seg.includes('{')) {
    const name = seg.slice(1)
    if (!PARAM_NAME_RE.test(name)) {
      throw new UntranslatableRouteError(
        ctx.originalPath,
        seg,
        'param name must contain only a-z, A-Z, 0-9, _',
      )
    }
    return { kind: 'append', value: ':' + name }
  }

  const open = seg.indexOf('{')
  const close = seg.indexOf('}', open)
  if (open === -1 || close === -1) {
    return { kind: 'append', value: seg }
  }

  const prefix = seg.slice(0, open)
  const inner = seg.slice(open + 1, close)
  const suffix = seg.slice(close + 1)

  if (inner === '$') {
    if (!ctx.isLast) {
      throw new UntranslatableRouteError(ctx.originalPath, seg, 'wildcard must be the last segment')
    }
    if (suffix) {
      throw new UntranslatableRouteError(ctx.originalPath, seg, 'wildcard cannot have a suffix')
    }
    return { kind: 'append', value: prefix + '*' }
  }

  if (inner.charCodeAt(0) === 36 && inner.length > 1) {
    const name = inner.slice(1)
    if (!PARAM_NAME_RE.test(name)) {
      throw new UntranslatableRouteError(
        ctx.originalPath,
        seg,
        'param name must contain only a-z, A-Z, 0-9, _',
      )
    }
    if (suffix) {
      throw new UntranslatableRouteError(
        ctx.originalPath,
        seg,
        `param with a literal suffix is not supported; use "$${name}" without suffix`,
      )
    }
    return { kind: 'append', value: prefix + ':' + name }
  }

  if (inner.startsWith('-$') && inner.length > 2) {
    const name = inner.slice(2)
    if (!PARAM_NAME_RE.test(name)) {
      throw new UntranslatableRouteError(
        ctx.originalPath,
        seg,
        'optional param name must contain only a-z, A-Z, 0-9, _',
      )
    }
    if (prefix || suffix) {
      throw new UntranslatableRouteError(
        ctx.originalPath,
        seg,
        'optional param cannot have a prefix or suffix',
      )
    }
    if (ctx.isLast) {
      return { kind: 'append', value: ':' + name + '?' }
    }
    return { kind: 'optional-pair', withParam: ':' + name }
  }

  return { kind: 'append', value: seg }
}
