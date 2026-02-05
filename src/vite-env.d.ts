/// <reference types="vite/client" />

import type { TrpcBridge } from '@/app/shared/trpcBridge';

declare global {
    interface Window {
        /** Exposed by the sandboxed preload. Absent when a page loads without it. */
        trpcBridge?: TrpcBridge;
    }
}
