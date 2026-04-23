import { createElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { RouterClient } from '@tanstack/react-router/ssr/client'
import { createAppRouter } from '$app/create.tsx'

const router = createAppRouter()

hydrateRoot(document, createElement(RouterClient, { router }))
