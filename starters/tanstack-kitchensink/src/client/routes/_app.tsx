import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ThemeProvider, useTheme } from '../lib/theme.tsx'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  const { theme } = Route.useRouteContext()
  return (
    <ThemeProvider defaultTheme={theme}>
      <ThemeIndicator />
      <Outlet />
    </ThemeProvider>
  )
}

function ThemeIndicator() {
  const { theme } = useTheme()
  return (
    <div className="theme-indicator">
      theme: <code>{theme}</code>
    </div>
  )
}
