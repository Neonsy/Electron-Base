/**
 * Contract shared by the main-process tRPC handler, the sandboxed preload, and the renderer link.
 *
 * The bridge carries plain serialized HTTP requests over one IPC channel. Both ends use tRPC's
 * public adapters (`httpBatchLink` in the renderer and `fetchRequestHandler` in main), so tRPC
 * upgrades never depend on internal tRPC modules.
 *
 * Keep this module free of Electron and Node imports: main, preload, and renderer bundle it.
 */

export const TRPC_IPC_CHANNEL = 'trpc:request';

/** Name of the preload global. Declared for the renderer in `src/vite-env.d.ts`. */
export const TRPC_BRIDGE_GLOBAL = 'trpcBridge';

/** tRPC's links and fetch adapter need an absolute URL. This origin is never contacted. */
export const TRPC_BRIDGE_URL = 'http://trpc.invalid/trpc';
export const TRPC_BRIDGE_ENDPOINT = '/trpc';

export interface TrpcBridgeRequest {
    url: string;
    method: 'GET' | 'POST';
    headers: [string, string][];
    body: string | null;
}

export interface TrpcBridgeResponse {
    status: number;
    statusText: string;
    headers: [string, string][];
    body: string;
}

export interface TrpcBridge {
    request: (request: TrpcBridgeRequest) => Promise<TrpcBridgeResponse>;
}
