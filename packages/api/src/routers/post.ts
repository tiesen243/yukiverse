import EventEmitter, { on } from 'events'
import type { TRPCRouterRecord } from '@trpc/server'

import { desc, eq } from '@yuki/db'
import { posts } from '@yuki/db/schema'
import { byIdSchema, createPostSchema } from '@yuki/validators/post'

import { protectedProcedure, publicProcedure } from '../trpc'

const ee = new EventEmitter()

export const postRouter = {
  all: publicProcedure.query(({ ctx }) =>
    ctx.db.query.posts.findMany({
      orderBy: desc(posts.createdAt),
      with: { author: { columns: { id: true, name: true, image: true } } },
    }),
  ),

  byId: publicProcedure.input(byIdSchema).query(({ ctx, input }) =>
    ctx.db.query.posts.findFirst({
      where: (posts, { eq }) => eq(posts.id, input.id),
    }),
  ),

  add: protectedProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      const [post] = await ctx.db
        .insert(posts)
        .values({
          ...input,
          authorId: ctx.session.user.id,
        })
        .returning({ id: posts.id })
      if (!post) throw new Error('Failed to create post')

      const newPost = await ctx.db.query.posts.findFirst({
        where: (posts, { eq }) => eq(posts.id, post.id),
        with: { author: { columns: { id: true, name: true, image: true } } },
      })

      ee.emit('add', newPost)
    }),

  onAdd: publicProcedure.subscription(async function* ({ signal }) {
    for await (const [data] of on(ee, 'add', { signal })) {
      const post = data as {
        id: string
        title: string
        content: string
        createdAt: Date
        authorId: string
        author: { id: string; name: string; image: string }
      }
      yield post
    }
  }),

  delete: protectedProcedure
    .input(byIdSchema)
    .mutation(async ({ ctx, input }) => {
      const [deletedPost] = await ctx.db
        .delete(posts)
        .where(eq(posts.id, input.id))
        .returning({ id: posts.id })
      ee.emit('delete', deletedPost)
    }),

  onDelete: publicProcedure.subscription(async function* ({ signal }) {
    for await (const [data] of on(ee, 'delete', { signal })) {
      const post = data as { id: string }
      yield post
    }
  }),
} satisfies TRPCRouterRecord
