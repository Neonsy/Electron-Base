import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';

import { createBridgeFetch } from '@/web/lib/trpcBridgeFetch';

import type { AppRouter } from '@/app/backend/trpc/router';
import { TRPC_BRIDGE_URL } from '@/app/shared/trpcBridge';

/** Vanilla client for code outside React components, such as `main.tsx`. */
export const trpcClient = createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: TRPC_BRIDGE_URL, fetch: createBridgeFetch(() => window.trpcBridge) })],
});

/** React bindings: `const trpc = useTRPC()` then `useQuery(trpc.system.getRuntimeInfo.queryOptions())`. */
export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();
