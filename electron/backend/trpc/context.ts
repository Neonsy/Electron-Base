/**
 * tRPC request context factory.
 * Provides per-request data (e.g., sender ID, window reference) to all procedures.
 */

import electron, { type BrowserWindow, type WebContents } from 'electron';

const { BrowserWindow: ElectronBrowserWindow } = electron;

export interface Context {
    // Identifies which renderer window sent the request (for multi-window apps)
    senderId: number;

    // Reference to the BrowserWindow that sent the request
    win: BrowserWindow | null;
}

export function createContext(sender: WebContents): Promise<Context> {
    return Promise.resolve({
        senderId: sender.id,
        win: ElectronBrowserWindow.fromWebContents(sender),
    });
}
