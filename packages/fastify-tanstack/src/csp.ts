import { createHash } from 'node:crypto'

// External scripts are covered by 'self'; only inline bodies need hashes
const INLINE_SCRIPT_RE = /<script(?![^>]*\ssrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi

// HTML parsing replaces raw NULs with U+FFFD, which breaks hashes and hydrated data
export function sanitizeInlineScripts(html: string): string {
  return html.replace(INLINE_SCRIPT_RE, (tag) => tag.split('\x00').join('\\u0000'))
}

export function inlineScriptHashes(html: string): string[] {
  const hashes = new Set<string>()
  for (const match of html.matchAll(INLINE_SCRIPT_RE)) {
    const body = match[1]
    if (!body) continue
    hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`)
  }
  return [...hashes]
}

// Nonces prove nothing once a shared cache replays the response; hashes still do
export function rewriteScriptSrc(header: string, hashes: string[]): string {
  let found = false
  const rewritten = header
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((directive) => {
      const [name = '', ...values] = directive.split(/\s+/)
      if (name.toLowerCase() !== 'script-src') return directive
      found = true
      const kept = values.filter((value) => !value.toLowerCase().startsWith("'nonce-"))
      return [name, ...kept, ...hashes.filter((hash) => !kept.includes(hash))].join(' ')
    })
    .join('; ')
  // Hashes only go in script-src; default-src would widen other fetch types
  return found ? rewritten : header
}
