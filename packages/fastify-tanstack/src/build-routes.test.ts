import { describe, expect, it } from 'vitest'
import { normalizeConfigKey } from './build-routes.ts'

describe('normalizeConfigKey', () => {
  it('maps root index to /', () => {
    expect(normalizeConfigKey('./routes/index.server.ts')).toBe('/')
  })

  it('maps __root to the sentinel id', () => {
    expect(normalizeConfigKey('./routes/__root.server.ts')).toBe('__root__')
  })

  it('maps plain routes', () => {
    expect(normalizeConfigKey('./routes/login.server.ts')).toBe('/login')
    expect(normalizeConfigKey('./routes/_app/cards/$id.server.ts')).toBe('/_app/cards/$id')
  })

  it('maps nested index to the index route id, not the parent', () => {
    expect(normalizeConfigKey('./routes/_app/index.server.ts')).toBe('/_app/')
    expect(normalizeConfigKey('./routes/posts/index.server.tsx')).toBe('/posts/')
  })

  it('returns null outside the routes dir or for non-server files', () => {
    expect(normalizeConfigKey('./lib/index.server.ts')).toBe(null)
    expect(normalizeConfigKey('./routes/index.ts')).toBe(null)
  })
})
