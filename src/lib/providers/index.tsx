import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { trpcClient, TRPCProvider } from '@/web/lib/trpc';

import type { ReactNode } from 'react';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60,
            retry: 1,
        },
    },
});

interface ProvidersProps {
    children: ReactNode;
}

export default function Providers({ children }: ProvidersProps): ReactNode {
    return (
        <QueryClientProvider client={queryClient}>
            <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
                {children}
            </TRPCProvider>
        </QueryClientProvider>
    );
}
