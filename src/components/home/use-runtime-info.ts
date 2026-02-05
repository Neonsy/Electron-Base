import { useQuery } from '@tanstack/react-query';

import { useTRPC } from '@/web/lib/trpc';

/** Runtime facts never change while the app runs, so one successful read is enough. */
export function useRuntimeInfo() {
    const trpc = useTRPC();
    return useQuery(trpc.system.getRuntimeInfo.queryOptions(undefined, { staleTime: Infinity }));
}
