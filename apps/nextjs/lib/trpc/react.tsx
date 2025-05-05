'use client'

import type { QueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import * as React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  createTRPCClient,
  httpBatchStreamLink,
  httpSubscriptionLink,
  loggerLink,
  splitLink,
} from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import SuperJSON from 'superjson'

import type { AppRouter } from '@yuki/api'

import { createQueryClient } from '@/lib/trpc/query-client'
import { getBaseUrl } from '@/lib/utils'

let clientQueryClientSingleton: QueryClient | undefined = undefined
const getQueryClient = () => {
  if (typeof window === 'undefined') return createQueryClient()
  else return (clientQueryClientSingleton ??= createQueryClient())
}

const TRPCContext = React.createContext<
  | {
      trpcClient: ReturnType<typeof createTRPCClient<AppRouter>>
      trpc: ReturnType<typeof createTRPCOptionsProxy<AppRouter>>
      queryClient: QueryClient
    }
  | undefined
>(undefined)

const useTRPC = () => {
  const context = React.use(TRPCContext)
  if (!context) throw new Error('useTRPC must be used within a TRPCProvider')
  return context
}

const TRPCReactProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = getQueryClient()

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: (op) =>
            // eslint-disable-next-line no-restricted-properties
            process.env.NODE_ENV === 'development' ||
            (op.direction === 'down' && op.result instanceof Error),
        }),
        splitLink({
          condition: (op) => op.type === 'subscription',
          false: httpBatchStreamLink({
            transformer: SuperJSON,
            url: getBaseUrl() + '/api/trpc',
            headers() {
              const headers = new Headers()
              headers.set('x-trpc-source', 'react-nextjs')
              return headers
            },
          }),
          true: httpSubscriptionLink({
            transformer: SuperJSON,
            url: getBaseUrl() + '/api/trpc',
            eventSourceOptions: () => ({
              headers: { 'x-trpc-source': 'react-nextjs' },
            }),
          }),
        }),
      ],
    }),
  )

  const [trpc] = useState(() =>
    createTRPCOptionsProxy<AppRouter>({ client: trpcClient, queryClient }),
  )

  const contextValue = React.useMemo(
    () => ({
      trpcClient,
      trpc,
      queryClient,
    }),
    [trpcClient, trpc, queryClient],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCContext value={contextValue}>{children}</TRPCContext>
    </QueryClientProvider>
  )
}

export { TRPCReactProvider, useTRPC }
