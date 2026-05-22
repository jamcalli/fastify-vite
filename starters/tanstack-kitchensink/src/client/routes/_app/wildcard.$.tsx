import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/wildcard/$')({
  component: Wildcard,
})

function Wildcard() {
  const { _splat = '' } = Route.useParams()
  const pathMatch = _splat.replace(/\/$/, '').split('/')
  return (
    <>
      <h1>Wildcard example that matches /wildcard/*</h1>
      <p>Path match: {pathMatch}</p>
      <p>
        <Link to="/">Go back to the index</Link>
      </p>
    </>
  )
}
