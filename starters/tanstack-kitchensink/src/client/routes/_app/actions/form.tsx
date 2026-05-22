import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/actions/form')({
  component: ActionForm,
})

function ActionForm() {
  return (
    <>
      <h1>Using inline server POST handler</h1>
      <form action="/api/admin-check" method="post">
        <label htmlFor="username">Username:</label>
        <input type="text" name="username" />
        <input type="submit" value="submit" />
      </form>
      <p>
        <Link to="/">Go back to the index</Link>
      </p>
    </>
  )
}
