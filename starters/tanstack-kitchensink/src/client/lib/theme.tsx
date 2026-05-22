import { createContext, type ReactNode, useContext, useState } from 'react'
import type { Theme } from '../types/router.ts'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// Router context only carries the initial SSR-derived value; this provider owns live state
export function ThemeProvider({
  defaultTheme,
  children,
}: {
  defaultTheme: Theme
  children: ReactNode
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const setTheme = (next: Theme) => {
    document.cookie = `theme=${next}; path=/; samesite=lax`
    setThemeState(next)
  }
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
