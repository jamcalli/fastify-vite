import '@fastify/cookie'

export interface SsrSession {
  user: string
}

declare module 'fastify' {
  interface FastifyRequest {
    ssrSession?: SsrSession | null
  }
}
