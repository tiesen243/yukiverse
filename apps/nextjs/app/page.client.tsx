'use client'

import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useSubscription } from '@trpc/tanstack-react-query'

import type { RouterOutputs } from '@yuki/api'
import { Button } from '@yuki/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@yuki/ui/components/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from '@yuki/ui/components/form'
import { Loader2Icon, XIcon } from '@yuki/ui/components/icons'
import { Input } from '@yuki/ui/components/input'
import { toast } from '@yuki/ui/sonner'
import { createPostSchema } from '@yuki/validators/post'

import { useTRPC } from '@/lib/trpc/react'

export const PostList: React.FC = () => {
  const { trpc, queryClient } = useTRPC()

  const { status: status1 } = useSubscription(
    trpc.post.onAdd.subscriptionOptions(undefined, {
      onData: (data) => {
        queryClient.setQueryData(trpc.post.all.queryKey(), (oldData) => {
          if (!oldData) return [data]
          return [data, ...oldData]
        })
      },
      onError: (error) => {
        toast.error(error.message)
      },
    }),
  )

  const { status: status2 } = useSubscription(
    trpc.post.onDelete.subscriptionOptions(undefined, {
      onData: (data) => {
        queryClient.setQueryData(trpc.post.all.queryKey(), (oldData) => {
          if (!oldData) return []
          return oldData.filter((post) => post.id !== data.id)
        })
      },
      onError: (error) => {
        toast.error(error.message)
      },
    }),
  )

  const { data } = useSuspenseQuery(trpc.post.all.queryOptions())

  return (
    <>
      <div>
        <div className="text-muted-foreground text-sm">
          <p>Add event status: {status1}</p>
          <p>Delete event status: {status2}</p>
        </div>
      </div>
      {data.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </>
  )
}

const PostCard: React.FC<{ post: RouterOutputs['post']['all'][number] }> = ({
  post,
}) => {
  const { trpc } = useTRPC()
  const { mutate, isPending } = useMutation(
    trpc.post.delete.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
    }),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{post.title}</CardTitle>
        <CardDescription>
          {post.author.name} - {post.createdAt.toDateString()}
        </CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              mutate({ id: post.id })
            }}
            disabled={isPending}
          >
            {isPending ? <Loader2Icon className="animate-spin" /> : <XIcon />}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        <p>{post.content}</p>
      </CardContent>
    </Card>
  )
}

export const PostCardSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle className="w-full animate-pulse rounded-sm bg-current">
        &nbsp;
      </CardTitle>
      <CardDescription className="w-1/2 animate-pulse rounded-sm bg-current">
        &nbsp;
      </CardDescription>
      <CardAction>
        <Button variant="outline" size="icon">
          <XIcon />
        </Button>
      </CardAction>
    </CardHeader>

    <CardContent>
      <div className="h-20 w-full animate-pulse rounded-sm bg-current" />
    </CardContent>
  </Card>
)

export const CreatePostForm: React.FC = () => {
  const { trpcClient } = useTRPC()
  const form = useForm({
    schema: createPostSchema,
    defaultValues: { title: '', content: '' },
    submitFn: trpcClient.post.add.mutate,
    onSuccess: () => {
      form.reset()
    },
    onError: (error) => {
      toast.error(error)
    },
  })

  return (
    <Form form={form}>
      <FormField
        name="title"
        render={(field) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl {...field}>
              <Input placeholder="Title" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="content"
        render={(field) => (
          <FormItem>
            <FormLabel>Content</FormLabel>
            <FormControl {...field}>
              <Input placeholder="Content" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Button disabled={form.isPending}>Create Post</Button>
    </Form>
  )
}
