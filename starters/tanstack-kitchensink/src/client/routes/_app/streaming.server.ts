import type { FastifyInstance } from 'fastify'

// Renderer reads request.routeOptions.streaming to switch from onAllReady to onShellReady
export const routeOptions = { streaming: true }

export default async function (_fastify: FastifyInstance) {}
