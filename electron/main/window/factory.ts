import electron, { type BrowserWindow } from 'electron';

import { attachNavigationGuards } from '@/app/main/window/navigationGuards';
import { resolveMainWindowPreloadPath } from '@/app/main/window/preloadPaths';

const { BrowserWindow: ElectronBrowserWindow } = electron;

export interface MainWindowOptions {
    /** The dev server URL in development, `app://bundle/index.html` in production. */
    appUrl: string;
    isDev: boolean;
    mainDirname: string;
}

export function createMainWindow(options: MainWindowOptions): BrowserWindow {
    const { appUrl, isDev, mainDirname } = options;

    const win = new ElectronBrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 960,
        minHeight: 540,
        show: false, // Prevent flash before maximize
        backgroundColor: '#07060d', // Match the app background to prevent a white flash
        webPreferences: {
            preload: resolveMainWindowPreloadPath(mainDirname),
            // Security hardening: isolate renderer from Node.js
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            // Disable devtools in production to prevent inspection
            devTools: isDev,
        },
    });

    const fallbackTimer = setTimeout(() => {
        if (!win.isDestroyed() && !win.isVisible()) {
            console.warn('[window] Renderer did not signal ready in time; showing window fallback.');
            win.show();
        }
    }, 3000);

    win.on('show', () => {
        clearTimeout(fallbackTimer);
    });

    win.on('closed', () => {
        clearTimeout(fallbackTimer);
    });

    attachNavigationGuards(win, {
        appUrl,
        isDev,
    });

    // Window showing is handled by the tRPC system.signalReady mutation.
    // This ensures the window only appears after React has actually rendered content,
    // preventing the blank flash that occurs with simpler approaches like 'ready-to-show'.
    void win.loadURL(appUrl);

    if (isDev) {
        // Detached devtools avoids layout interference during development
        win.webContents.openDevTools({ mode: 'detach' });
    }

    return win;
}
