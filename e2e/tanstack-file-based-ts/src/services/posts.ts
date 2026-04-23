export interface Post {
  id: string
  title: string
  body: string
  loadedAt: string
}

export async function loadPost(id: string): Promise<Post> {
  return {
    id,
    title: `Post ${id}`,
    body: 'Lorem ipsum, loaded via TanStack loader fetching a Fastify endpoint.',
    loadedAt: new Date().toISOString(),
  }
}

export const postQueryOptions = (id: string) => ({
  queryKey: ['posts', id] as const,
  queryFn: async (): Promise<Post> => {
    const res = await fetch(`/api/posts/${id}`)
    if (!res.ok) throw new Error(`Failed to load post ${id}`)
    return (await res.json()) as Post
  },
})
