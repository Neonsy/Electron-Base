import type { TrpcBridge } from '@/app/shared/trpcBridge';

// Statuses whose Response must not carry a body.
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

// The subset of RequestInit that tRPC's links pass to a custom fetch.
interface BridgeRequestInit {
    method?: string | undefined;
    headers?: HeadersInit | undefined;
    body?: unknown;
}

/**
 * Creates a `fetch` for tRPC's standard `httpBatchLink` that sends each request to the main
 * process through the preload bridge instead of the network.
 */
export function createBridgeFetch(getBridge: () => TrpcBridge | undefined) {
    return async function bridgeFetch(input: RequestInfo | URL, init?: BridgeRequestInit): Promise<Response> {
        const bridge = getBridge();
        if (!bridge) {
            throw new Error('The tRPC bridge is unavailable. Load this window with the app preload script.');
        }

        const method = (init?.method ?? 'GET').toUpperCase();
        if (method !== 'GET' && method !== 'POST') {
            throw new Error(`The tRPC bridge does not support ${method} requests.`);
        }

        const body = init?.body ?? null;
        if (body !== null && typeof body !== 'string') {
            throw new Error('The tRPC bridge only sends string request bodies.');
        }

        const response = await bridge.request({
            url: input instanceof Request ? input.url : input.toString(),
            method,
            headers: Array.from(new Headers(init?.headers)),
            body,
        });

        return new Response(NULL_BODY_STATUSES.has(response.status) ? null : response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        });
    };
}
