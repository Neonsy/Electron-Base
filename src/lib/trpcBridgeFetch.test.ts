import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import { initTRPC } from '@trpc/server';
import { type } from 'arktype';
import { describe, expect, it } from 'vitest';

import { createBridgeFetch } from '@/web/lib/trpcBridgeFetch';

import { setUpdateChannelInput } from '@/app/backend/trpc/routers/system/updateChannelInput';
import { handleTrpcBridgeRequest, parseTrpcBridgeRequest } from '@/app/main/ipc/trpcBridge';
import { TRPC_BRIDGE_URL, type TrpcBridge } from '@/app/shared/trpcBridge';

interface TestContext {
    senderId: number;
}

const t = initTRPC.context<TestContext>().create({ isServer: true });

const testRouter = t.router({
    whoAmI: t.procedure.query(({ ctx }) => ({ senderId: ctx.senderId })),
    greet: t.procedure.input(type({ name: 'string' })).query(({ input }) => `Hello, ${input.name}`),
    setChannel: t.procedure.input(setUpdateChannelInput).mutation(({ input }) => input),
});

// Replaces only Electron's IPC hop: requests are structured-cloned like ipcRenderer.invoke does.
function createTestClient() {
    const bridge: TrpcBridge = {
        request: (request) =>
            handleTrpcBridgeRequest({
                router: testRouter,
                createContext: () => Promise.resolve({ senderId: 7 }),
                request: structuredClone(request),
            }),
    };

    return createTRPCClient<typeof testRouter>({
        links: [httpBatchLink({ url: TRPC_BRIDGE_URL, fetch: createBridgeFetch(() => bridge) })],
    });
}

describe('tRPC IPC bridge', () => {
    it('runs queries with the sender context', async () => {
        const client = createTestClient();

        await expect(client.whoAmI.query()).resolves.toEqual({ senderId: 7 });
    });

    it('batches concurrent calls and keeps each result', async () => {
        const client = createTestClient();

        await expect(
            Promise.all([client.greet.query({ name: 'Ada' }), client.greet.query({ name: 'Linus' })])
        ).resolves.toEqual(['Hello, Ada', 'Hello, Linus']);
    });

    it('runs mutations with validated input', async () => {
        const client = createTestClient();

        await expect(client.setChannel.mutate({ channel: 'beta' })).resolves.toEqual({ channel: 'beta' });
    });

    it('reports schema failures as BAD_REQUEST', async () => {
        const client = createTestClient();
        const invalidInput = { channel: 'canary' } as unknown as { channel: 'stable' };

        const error: unknown = await client.setChannel.mutate(invalidInput).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(TRPCClientError);
        expect((error as TRPCClientError<typeof testRouter>).data?.code).toBe('BAD_REQUEST');
    });

    it('fails clearly when the preload bridge is missing', async () => {
        const client = createTRPCClient<typeof testRouter>({
            links: [httpBatchLink({ url: TRPC_BRIDGE_URL, fetch: createBridgeFetch(() => undefined) })],
        });

        await expect(client.whoAmI.query()).rejects.toThrow('The tRPC bridge is unavailable');
    });
});

describe('parseTrpcBridgeRequest', () => {
    const valid = {
        url: `${TRPC_BRIDGE_URL}/system.getRuntimeInfo`,
        method: 'GET',
        headers: [],
        body: null,
    };

    it('accepts the serialized request shape', () => {
        expect(parseTrpcBridgeRequest(valid)).toEqual(valid);
    });

    it.each([
        ['a non-object', 'request'],
        ['an undeclared key', { ...valid, credentials: 'include' }],
        ['another method', { ...valid, method: 'DELETE' }],
        ['another origin', { ...valid, url: 'https://example.com/trpc/system.getRuntimeInfo' }],
        ['a path outside the endpoint', { ...valid, url: 'http://trpc.invalid/other' }],
        ['an oversized body', { ...valid, method: 'POST', body: 'x'.repeat(1024 * 1024 + 1) }],
    ])('rejects %s', (_description, request) => {
        expect(() => parseTrpcBridgeRequest(request)).toThrow('Rejected');
    });
});
