/**
 * Auto-updater setup.
 * Checks for updates on startup, downloads silently, prompts user when ready.
 * Requires a publish provider configured in the electron-builder configuration.
 */

import electron, { type BrowserWindow } from 'electron';
import electronUpdater, { type ProgressInfo } from 'electron-updater';
import path from 'node:path';

import {
    applyUpdateChannel,
    isUpdateChannel,
    loadOrSeedUpdateChannel,
    UPDATE_CHANNEL_PREFERENCE_FILENAME,
    writeUpdateChannelPreference,
    type UpdateChannel,
} from '@/app/main/updates/channel';

const { app, BrowserWindow: ElectronBrowserWindow, dialog } = electron;

let selectedChannel: UpdateChannel | null = null;
let updaterActive = false;
let startupUpdateCheck: Promise<void> | null = null;
// Keep persisted state and the updater's active feed ordered across concurrent tRPC calls.
let channelChangeQueue: Promise<void> = Promise.resolve();

function getAutoUpdater() {
    return electronUpdater.autoUpdater;
}

export function getUpdateChannel(): Promise<UpdateChannel> {
    return enqueueChannelOperation(resolveSelectedChannel);
}

export function setUpdateChannel(channel: UpdateChannel): Promise<UpdateChannel> {
    return enqueueChannelOperation(async () => {
        if (!isUpdateChannel(channel)) {
            throw new TypeError('Update channel must be either "stable" or "beta".');
        }

        await writeUpdateChannelPreference(getUpdateChannelPreferencePath(), channel);
        selectedChannel = channel;

        if (!updaterActive) {
            return channel;
        }

        try {
            // electron-updater reuses an in-flight check, so wait before changing its feed.
            await waitForStartupUpdateCheck();
            const autoUpdater = getAutoUpdater();
            applyUpdateChannel(autoUpdater, channel);
            await autoUpdater.checkForUpdates();
        } catch (error: unknown) {
            throw new Error(
                `The update channel was saved as "${channel}", but activating and checking that channel failed.`,
                { cause: error }
            );
        }

        return channel;
    });
}

export function initAutoUpdater(): void {
    const initialization = enqueueChannelOperation(initAutoUpdaterInternal);
    void initialization.catch((error: unknown) => {
        updaterActive = false;
        console.error('Unable to initialize the auto-updater:', error);
    });
}

async function initAutoUpdaterInternal(): Promise<void> {
    const channel = await resolveSelectedChannel();

    if (!app.isPackaged && process.env['UPDATER_ENABLED'] !== '1') {
        return;
    }

    if (updaterActive) {
        return;
    }

    const autoUpdater = getAutoUpdater();
    applyUpdateChannel(autoUpdater, channel);

    // Download in the background, then let the user restart now or defer until app quit.
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true; // Install on quit if user chose "Later"

    // Show native taskbar/dock progress during download
    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
        getMainWindow()?.setProgressBar(progress.percent / 100);
    });

    // Prompt user when download completes
    autoUpdater.on('update-downloaded', () => {
        const mainWindow = getMainWindow();
        mainWindow?.setProgressBar(-1);

        // If no window available, skip dialog (autoInstallOnAppQuit handles it)
        if (!mainWindow) return;

        void showUpdateReadyDialog(mainWindow);
    });

    autoUpdater.on('error', (error) => {
        console.error('Auto-updater error:', error);
        getMainWindow()?.setProgressBar(-1);
    });

    updaterActive = true;
    startupUpdateCheck = checkForUpdatesOnStartup();
}

async function resolveSelectedChannel(): Promise<UpdateChannel> {
    if (selectedChannel) {
        return selectedChannel;
    }

    const resolved = await loadOrSeedUpdateChannel(getUpdateChannelPreferencePath(), app.getVersion());
    selectedChannel = resolved.channel;

    if (resolved.source === 'invalid') {
        console.warn(`[updater] Replaced an invalid channel preference with inferred channel "${selectedChannel}".`);
    }

    return selectedChannel;
}

function enqueueChannelOperation<T>(operation: () => Promise<T>): Promise<T> {
    const result = channelChangeQueue.then(operation);
    channelChangeQueue = result.then(
        () => undefined,
        () => undefined
    );
    return result;
}

function getUpdateChannelPreferencePath(): string {
    return path.join(app.getPath('userData'), UPDATE_CHANNEL_PREFERENCE_FILENAME);
}

function getMainWindow(): BrowserWindow | null {
    return ElectronBrowserWindow.getAllWindows().find((window) => !window.isDestroyed()) ?? null;
}

async function waitForStartupUpdateCheck(): Promise<void> {
    const check = startupUpdateCheck;

    if (!check) {
        return;
    }

    await check;

    if (startupUpdateCheck === check) {
        startupUpdateCheck = null;
    }
}

async function checkForUpdatesOnStartup(): Promise<void> {
    try {
        await getAutoUpdater().checkForUpdates();
    } catch (error: unknown) {
        console.error('Auto-updater initial check failed:', error);
    }
}

async function showUpdateReadyDialog(mainWindow: BrowserWindow): Promise<void> {
    try {
        const { response } = await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Update Ready',
            message: 'A new version has been downloaded.',
            detail: 'Would you like to restart now to install the update, or install it when you quit?',
            buttons: ['Restart Now', 'Later'],
            defaultId: 0,
            cancelId: 1,
        });

        if (response === 0) {
            app.removeAllListeners('window-all-closed');
            getAutoUpdater().quitAndInstall(false, true);
        }
        // If "Later", autoInstallOnAppQuit handles it.
    } catch (error: unknown) {
        console.error('Unable to show the update-ready dialog:', error);
    }
}
