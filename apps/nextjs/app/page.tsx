import { Suspense } from 'react'

import { getQueryClient, HydrateClient, trpc } from '@/lib/trpc/server'
import { CreatePostForm, PostCardSkeleton, PostList } from './page.client'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const queryClient = getQueryClient()
  void queryClient.prefetchQuery(trpc.post.all.queryOptions())

  return (
    <HydrateClient>
      <main className="container py-4">
        <CreatePostForm />

        <div className="mt-4 grid gap-4">
          <Suspense
            fallback={Array.from({ length: 3 }, (_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          >
            <PostList />
          </Suspense>
        </div>
      </main>
    </HydrateClient>
  )
}
