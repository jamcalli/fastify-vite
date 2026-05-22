import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

function formQueryOptions(id: string) {
  return {
    queryKey: ['form', id] as const,
    queryFn: (): { number: string } => ({ number: '' }),
  }
}

export const Route = createFileRoute('/_app/form/$id')({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(formQueryOptions(params.id)),
  component: Form,
})

function Form() {
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(formQueryOptions(id))
  return (
    <>
      <h1>Form example with dynamic URL</h1>
      <form method="post">
        <label htmlFor="number">Magic number:</label>
        <br />
        <input type="text" id="number" name="number" defaultValue={data.number} />
        <br />
        <small>
          Submit "42" to see the primed value echoed back; anything else redirects to /.
        </small>
        <br />
        <input type="submit" value="Submit" />
      </form>
    </>
  )
}
