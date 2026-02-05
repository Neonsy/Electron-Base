import electron, { type BrowserWindow, type WebContents } from 'electron';
import path from 'node:path';

import type { Context } from '@/app/backend/trpc/context';
import type { AppRouter } from '@/app/backend/trpc/router';
import { registerTrpcBridge } from '@/app/main/ipc/registerTrpcBridge';
import { flushAppLogger, initAppLogger } from '@/app/main/logging';
import { handleAppProtocol, registerAppSchemePrivileges } from '@/app/main/protocol/appProtocol';
import { APP_ENTRY_URL } from '@/app/main/protocol/assetPath';
import { devServerUrl, getMainDirname, isDev } from '@/app/main/runtime/env';
import { attachDevServerCspHeaders } from '@/app/main/security/cspHeaders';
import { getCspHeader } from '@/app/main/security/cspPolicy';
import { hardenDefaultSession } from '@/app/main/security/sessionPolicy';
import { isAppNavigation } from '@/app/main/security/urlPolicy';
import { createMainWindow } from '@/app/main/window/factory';

const { app, BrowserWindow: ElectronBrowserWindow, Menu } = electron;

interface BootstrapDeps {
    createContext: (sender: WebContents) => Promise<Context>;
    appRouter: AppRouter;
    initAutoUpdater: () => void;
}

export function bootstrapMainProcess(deps: BootstrapDeps, importMetaUrl: string): void {
    const { createContext, appRouter, initAutoUpdater } = deps;

    // A second launch focuses the running instance instead of opening a competing process
    // that would race it for userData files and the updater.
    if (!app.requestSingleInstanceLock()) {
        app.quit();
        return;
    }

    const mainDirname = getMainDirname(importMetaUrl);
    const appUrl = isDev && devServerUrl ? devServerUrl : APP_ENTRY_URL;
    const windowOptions = { appUrl, isDev, mainDirname };

    let mainWindow: BrowserWindow | null = null;

    // Custom schemes must be registered before the ready event.
    registerAppSchemePrivileges();

    app.on('second-instance', () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
            return;
        }

        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.focus();
    });

    void app.whenReady().then(() => {
        initAppLogger({
            isDev,
            version: app.getVersion(),
        });

        // Remove default menu bar (File, Edit, View, Help)
        Menu.setApplicationMenu(null);

        hardenDefaultSession();

        if (isDev && devServerUrl) {
            attachDevServerCspHeaders(devServerUrl);
        } else {
            handleAppProtocol({
                rendererRoot: path.join(mainDirname, '../dist'),
                contentSecurityPolicy: getCspHeader('prod'),
            });
        }

        // One IPC channel serves every window; only top-level frames on the app origin may call it.
        registerTrpcBridge({
            router: appRouter,
            createContext,
            isTrustedFrame: (frame) => frame.parent === null && isAppNavigation(frame.url, appUrl),
        });

        mainWindow = createMainWindow(windowOptions);

        initAutoUpdater();
    });

    app.on('before-quit', () => {
        void flushAppLogger();
    });

    // Standard quit behavior: exit when all windows closed (except macOS)
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    // macOS: re-create window when dock icon clicked with no windows open
    app.on('activate', () => {
        if (app.isReady() && ElectronBrowserWindow.getAllWindows().length === 0) {
            mainWindow = createMainWindow(windowOptions);
        }
    });
}
