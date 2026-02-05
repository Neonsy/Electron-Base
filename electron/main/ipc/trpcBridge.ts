import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { type } from 'arktype';

import {
    TRPC_BRIDGE_ENDPOINT,
    TRPC_BRIDGE_URL,
    type TrpcBridgeRequest,
    type TrpcBridgeResponse,
} from '@/app/shared/trpcBridge';

import type { AnyTRPCRouter, inferRouterContext } from '@trpc/server';

const MAX_URL_LENGTH = 64 * 1024;
const MAX_BODY_LENGTH = 1024 * 1024;
const bridgeOrigin = new URL(TRPC_BRIDGE_URL).origin;

// The renderer is untrusted input: accept only the exact serialized request shape.
const trpcBridgeRequest = type({
    '+': 'reject',
    url: type.string.atMostLength(MAX_URL_LENGTH),
    method: "'GET' | 'POST'",
    headers: type(['string', 'string']).array().atMostLength(64),
    body: type.string.atMostLength(MAX_BODY_LENGTH).or('null'),
});

export class TrpcBridgeRequestError extends Error {
    override name = 'TrpcBridgeRequestError';
}

export function parseTrpcBridgeRequest(raw: unknown): TrpcBridgeRequest {
    const parsed = trpcBridgeRequest(raw);

    if (parsed instanceof type.errors) {
        throw new TrpcBridgeRequestError(`Rejected malformed tRPC bridge request: ${parsed.summary}`);
    }

    const url = new URL(parsed.url);
    if (url.origin !== bridgeOrigin || !url.pathname.startsWith(`${TRPC_BRIDGE_ENDPOINT}/`)) {
        throw new TrpcBridgeRequestError('Rejected a tRPC bridge request for an unexpected URL.');
    }

    return parsed;
}

export interface HandleTrpcBridgeRequestOptions<TRouter extends AnyTRPCRouter> {
    router: TRouter;
    createContext: () => Promise<inferRouterContext<TRouter>>;
    request: unknown;
}

/** Runs one serialized renderer request through tRPC's public fetch adapter. */
export async function handleTrpcBridgeRequest<TRouter extends AnyTRPCRouter>(
    options: HandleTrpcBridgeRequestOptions<TRouter>
): Promise<TrpcBridgeResponse> {
    const { router, createContext } = options;
    const request = parseTrpcBridgeRequest(options.request);
    const init: RequestInit = { method: request.method, headers: request.headers };

    if (request.method === 'POST' && request.body !== null) {
        init.body = request.body;
    }

    const response = await fetchRequestHandler({
        endpoint: TRPC_BRIDGE_ENDPOINT,
        req: new Request(request.url, init),
        router,
        createContext,
    });

    return {
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers),
        body: await response.text(),
    };
}
