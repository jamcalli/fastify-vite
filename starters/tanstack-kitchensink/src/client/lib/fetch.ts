// Client-only; uses relative paths, so no base URL configuration is needed
export function sendJSON(path: string, options: RequestInit & { json?: unknown } = {}) {
  const { json, ...rest } = options
  return fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...(json !== undefined && { body: JSON.stringify(json) }),
    ...rest,
  })
}
