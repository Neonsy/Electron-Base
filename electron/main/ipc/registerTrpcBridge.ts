import electron, { type WebContents, type WebFrameMain } from 'electron';

import { handleTrpcBridgeRequest, TrpcBridgeRequestError } from '@/app/main/ipc/trpcBridge';
import { TRPC_IPC_CHANNEL } from '@/app/shared/trpcBridge';

import type { AnyTRPCRouter, inferRouterContext } from '@trpc/server';

const { ipcMain } = electron;

export interface RegisterTrpcBridgeOptions<TRouter extends AnyTRPCRouter> {
    router: TRouter;
    createContext: (sender: WebContents) => Promise<inferRouterContext<TRouter>>;
    /** Only frames that pass this check can call procedures. */
    isTrustedFrame: (frame: WebFrameMain) => boolean;
}

/** Serves tRPC for every window through one invoke channel. Call once after the app is ready. */
export function registerTrpcBridge<TRouter extends AnyTRPCRouter>(options: RegisterTrpcBridgeOptions<TRouter>): void {
    const { router, createContext, isTrustedFrame } = options;

    ipcMain.handle(TRPC_IPC_CHANNEL, (event, request: unknown) => {
        const frame = event.senderFrame;

        if (!frame || !isTrustedFrame(frame)) {
            throw new TrpcBridgeRequestError('Rejected a tRPC request from an untrusted frame.');
        }

        return handleTrpcBridgeRequest({
            router,
            createContext: () => createContext(event.sender),
            request,
        });
    });
}
