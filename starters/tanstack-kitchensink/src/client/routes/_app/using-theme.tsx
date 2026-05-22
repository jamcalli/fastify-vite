import { createFileRoute, Link } from '@tanstack/react-router'
import { useTheme } from '../../lib/theme.tsx'

export const Route = createFileRoute('/_app/using-theme')({
  head: () => ({ meta: [{ title: 'Using SSR Request State' }] }),
  component: UsingTheme,
})

function UsingTheme() {
  const { theme, setTheme } = useTheme()
  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  return (
    <>
      <h1>Using SSR Request State</h1>
      <p>
        Current theme: <code>{theme}</code>
      </p>
      <p>
        <input
          type="button"
          value={`Switch to ${theme === 'dark' ? 'light' : 'dark'}`}
          onClick={toggle}
        />
      </p>
      <p>
        <Link to="/">Go back to the index</Link>
      </p>
      <p>⁂</p>
      <p>
        <code>__root.server.ts</code> reads the <code>theme</code> cookie into{' '}
        <code>req.ssrTheme</code>, and <code>create.tsx</code> seeds the router context with it.{' '}
        <code>ThemeProvider</code> in <code>_app.tsx</code> takes that as its initial value and owns
        live state from there, so toggling re-renders consumers without a reload.
      </p>
    </>
  )
}
