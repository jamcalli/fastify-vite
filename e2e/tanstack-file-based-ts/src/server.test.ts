import test from 'node:test'
import assert from 'node:assert'
import { resolve } from 'node:path'
import { makeBuildTest, makeIndexTest } from '../../test-factories.mjs'
import { main } from './server.ts'

const viteConfigLocation = resolve(import.meta.dirname, '..')

test('tanstack-file-based-ts', async (t) => {
  await t.test('build production bundle', makeBuildTest({ cwd: viteConfigLocation }))
  await t.test('render index page in production', makeIndexTest({ main, dev: false }))
  await t.test('render index page in development', makeIndexTest({ main, dev: true }))

  await t.test('_auth preHandler redirects without session cookie', async () => {
    const server = await main(true)
    const response = await server.inject({ method: 'GET', url: '/dashboard' })
    assert.strictEqual(response.statusCode, 302)
    assert.strictEqual(response.headers.location, '/login?redirect=%2Fdashboard')
    await server.close()
  })

  await t.test('_auth preHandler allows with session cookie', async () => {
    const server = await main(true)
    const response = await server.inject({
      method: 'GET',
      url: '/dashboard',
      headers: { cookie: 'session=demo' },
    })
    assert.strictEqual(response.statusCode, 200)
    assert.strictEqual(response.headers['x-auth-prehandler'], 'ran')
    await server.close()
  })

  await t.test('root hooks cascade to all routes', async () => {
    const server = await main(true)
    const response = await server.inject({ method: 'GET', url: '/about' })
    assert.strictEqual(response.statusCode, 200)
    assert.strictEqual(response.headers['x-powered-by'], '@fastify/tanstack')
    assert.strictEqual(response.headers['x-frame-options'], 'DENY')
    assert.strictEqual(response.headers['x-root-prehandler'], 'ran')
    await server.close()
  })

  await t.test('posts loader hits primed cache', async () => {
    const server = await main(true)
    const response = await server.inject({ method: 'GET', url: '/posts/1' })
    assert.strictEqual(response.statusCode, 200)
    assert.match(response.body, /Post 1/)
    assert.match(response.body, /Lorem ipsum/)
    assert.match(response.body, /Loaded at:.*\d{4}-\d{2}-\d{2}T/)
    await server.close()
  })

  await t.test('dashboard renders ssr-populated session from router context', async () => {
    const server = await main(true)
    const response = await server.inject({
      method: 'GET',
      url: '/dashboard',
      headers: { cookie: 'session=alice' },
    })
    assert.strictEqual(response.statusCode, 200)
    assert.match(response.body, /Welcome, alice/)
    await server.close()
  })

  await t.test('route-level preHandler runs alongside cascaded hooks', async () => {
    const server = await main(true)
    const response = await server.inject({
      method: 'GET',
      url: '/dashboard',
      headers: { cookie: 'session=demo' },
    })
    assert.strictEqual(response.statusCode, 200)
    assert.strictEqual(response.headers['x-dashboard-prehandler'], 'ran')
    assert.strictEqual(response.headers['x-auth-prehandler'], 'ran')
    assert.strictEqual(response.headers['x-root-prehandler'], 'ran')
    await server.close()
  })

  await t.test('unmatched route renders notFoundComponent with 404 status', async () => {
    const server = await main(true)
    const response = await server.inject({ method: 'GET', url: '/does-not-exist' })
    assert.strictEqual(response.statusCode, 404)
    assert.match(response.body, /404 - Not Found/)
    await server.close()
  })

  await t.test('POST /api/login sets session cookie and redirects to dashboard', async () => {
    const server = await main(true)
    const response = await server.inject({
      method: 'POST',
      url: '/api/login',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: '',
    })
    assert.strictEqual(response.statusCode, 302)
    assert.strictEqual(response.headers.location, '/dashboard')
    const setCookie = String(response.headers['set-cookie'])
    assert.match(setCookie, /session=demo/)
    assert.match(setCookie, /HttpOnly/i)
    assert.match(setCookie, /SameSite=Lax/i)
    await server.close()
  })

  await t.test('GET /api/get-session returns null without cookie', async () => {
    const server = await main(true)
    const response = await server.inject({ method: 'GET', url: '/api/get-session' })
    assert.strictEqual(response.statusCode, 200)
    assert.strictEqual(response.body, 'null')
    await server.close()
  })

  await t.test('GET /api/get-session returns user with cookie', async () => {
    const server = await main(true)
    const response = await server.inject({
      method: 'GET',
      url: '/api/get-session',
      headers: { cookie: 'session=alice' },
    })
    assert.strictEqual(response.statusCode, 200)
    assert.deepStrictEqual(JSON.parse(response.body), { user: 'alice' })
    await server.close()
  })

  await t.test('POST /api/login uses submitted username as the session cookie', async () => {
    const server = await main(true)
    const response = await server.inject({
      method: 'POST',
      url: '/api/login',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'username=alice',
    })
    assert.strictEqual(response.statusCode, 302)
    assert.match(String(response.headers['set-cookie']), /session=alice/)
    await server.close()
  })

  await t.test('POST /api/login honors safe redirect target from form body', async () => {
    const server = await main(true)
    const response = await server.inject({
      method: 'POST',
      url: '/api/login',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'username=alice&redirect=%2Fposts%2F1',
    })
    assert.strictEqual(response.statusCode, 302)
    assert.strictEqual(response.headers.location, '/posts/1')
    await server.close()
  })

  await t.test('POST /api/login rejects protocol-relative redirect target', async () => {
    const server = await main(true)
    const response = await server.inject({
      method: 'POST',
      url: '/api/login',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'username=alice&redirect=%2F%2Fevil.com',
    })
    assert.strictEqual(response.statusCode, 302)
    assert.strictEqual(response.headers.location, '/dashboard')
    await server.close()
  })

  await t.test('POST /api/logout clears session cookie and redirects to login', async () => {
    const server = await main(true)
    const response = await server.inject({
      method: 'POST',
      url: '/api/logout',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: 'session=demo',
      },
      payload: '',
    })
    assert.strictEqual(response.statusCode, 302)
    assert.strictEqual(response.headers.location, '/login')
    const setCookie = String(response.headers['set-cookie'])
    assert.match(setCookie, /session=;/)
    assert.match(setCookie, /Expires=|Max-Age=/i)
    await server.close()
  })
})
