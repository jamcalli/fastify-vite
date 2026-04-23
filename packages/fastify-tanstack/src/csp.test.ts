import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { inlineScriptHashes, rewriteScriptSrc, sanitizeInlineScripts } from './csp.ts'

const hashOf = (body: string) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`

describe('inlineScriptHashes', () => {
  it('hashes inline script bodies', () => {
    const html = '<html><body><script>alert(1)</script></body></html>'
    expect(inlineScriptHashes(html)).toEqual([hashOf('alert(1)')])
  })

  it('hashes scripts with attributes', () => {
    const html = '<script nonce="abc" type="module">run()</script>'
    expect(inlineScriptHashes(html)).toEqual([hashOf('run()')])
  })

  it('ignores external scripts', () => {
    const html = '<script src="/app.js"></script><script src="/b.js" defer></script>'
    expect(inlineScriptHashes(html)).toEqual([])
  })

  it('skips empty bodies', () => {
    expect(inlineScriptHashes('<script></script>')).toEqual([])
  })

  it('dedupes identical bodies', () => {
    const html = '<script>x()</script><script>x()</script><script>y()</script>'
    expect(inlineScriptHashes(html)).toEqual([hashOf('x()'), hashOf('y()')])
  })

  it('handles multiline bodies', () => {
    const body = 'const a = 1\nconst b = 2\n'
    expect(inlineScriptHashes(`<script>${body}</script>`)).toEqual([hashOf(body)])
  })
})

describe('sanitizeInlineScripts', () => {
  it('escapes raw NULs in inline script bodies', () => {
    expect(sanitizeInlineScripts('<script>a("\x00b\x00")</script>')).toBe(
      '<script>a("\\u0000b\\u0000")</script>',
    )
  })

  it('leaves content outside inline scripts untouched', () => {
    const html = '\x00<p>\x00</p><script src="/a.js"></script>'
    expect(sanitizeInlineScripts(html)).toBe(html)
  })

  it('is a no-op without NULs', () => {
    const html = '<script>run()</script>'
    expect(sanitizeInlineScripts(html)).toBe(html)
  })
})

describe('rewriteScriptSrc', () => {
  const hashes = [hashOf('alert(1)'), hashOf('run()')]

  it('strips nonce tokens and appends hashes', () => {
    const header = "default-src 'self'; script-src 'self' 'nonce-abc123'; img-src 'self'"
    expect(rewriteScriptSrc(header, hashes)).toBe(
      `default-src 'self'; script-src 'self' ${hashes.join(' ')}; img-src 'self'`,
    )
  })

  it('preserves other directives untouched', () => {
    const header = "style-src 'self' 'unsafe-inline'; script-src 'self'"
    expect(rewriteScriptSrc(header, hashes)).toBe(
      `style-src 'self' 'unsafe-inline'; script-src 'self' ${hashes.join(' ')}`,
    )
  })

  it('returns the header unchanged without a script-src directive', () => {
    const header = "default-src 'self'; img-src data:"
    expect(rewriteScriptSrc(header, hashes)).toBe(header)
  })

  it('does not duplicate hashes already present', () => {
    const header = `script-src 'self' ${hashes[0]}`
    expect(rewriteScriptSrc(header, hashes)).toBe(`script-src 'self' ${hashes[0]} ${hashes[1]}`)
  })

  it('handles empty hash lists', () => {
    const header = "script-src 'self' 'nonce-abc'"
    expect(rewriteScriptSrc(header, [])).toBe("script-src 'self'")
  })
})
