/**
 * Preload script - runs in the sandboxed, isolated context before the renderer loads.
 * Exposes only the tRPC request function to the renderer (minimal attack surface).
 */

import { contextBridge, ipcRenderer } from 'electron';

import { TRPC_BRIDGE_GLOBAL, TRPC_IPC_CHANNEL, type TrpcBridge } from '@/app/shared/trpcBridge';

const trpcBridge: TrpcBridge = {
    request: (request) => ipcRenderer.invoke(TRPC_IPC_CHANNEL, request),
};

contextBridge.exposeInMainWorld(TRPC_BRIDGE_GLOBAL, trpcBridge);
