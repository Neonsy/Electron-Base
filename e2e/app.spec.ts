import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';
import path from 'node:path';

import type { WebContents, WebPreferences } from 'electron';

interface WebContentsWithPreferences extends WebContents {
    getLastWebPreferences(): WebPreferences | null;
}

test.describe.configure({ mode: 'serial' });

let electronApp: ElectronApplication;
let window: Page;

test.beforeAll(async ({}, testInfo) => {
    const environment = { ...process.env };
    delete environment['VITE_DEV_SERVER_URL'];
    // Terminals inside Electron-based editors export this, which would start Electron as plain Node.
    delete environment['ELECTRON_RUN_AS_NODE'];

    // Launch the project directory so Electron reads package.json (name, version, and main).
    electronApp = await electron.launch({
        args: [
            path.resolve('.'),
            `--user-data-dir=${testInfo.outputPath('user-data')}`,
            // The test window sits off-screen (see below). Keep Chromium rendering it anyway.
            '--disable-features=CalculateNativeWinOcclusion',
            '--disable-backgrounding-occluded-windows',
        ],
        env: {
            ...environment,
            UPDATER_ENABLED: '0',
        },
    });

    // Keep test runs from covering or focusing the developer's screen: show windows without
    // activating them, past the right edge of every display, and skip maximizing.
    await electronApp.evaluate(({ BrowserWindow, screen }) => {
        const offScreenX = Math.max(...screen.getAllDisplays().map(({ bounds }) => bounds.x + bounds.width)) + 100;
        BrowserWindow.prototype.show = function show(this: Electron.BrowserWindow) {
            this.setPosition(offScreenX, 0);
            this.showInactive();
        };
        BrowserWindow.prototype.maximize = () => undefined;
    });

    window = await electronApp.firstWindow();
});

test.afterAll(async () => {
    await electronApp.close();
});

test('serves the production renderer from the app:// origin', async () => {
    await expect(window).toHaveTitle('Electron Template');
    expect(window.url()).toBe('app://bundle/index.html');
    await expect(window.getByRole('heading', { level: 1, name: "Neonsy's Electron Starter Template" })).toBeVisible();
    // The update channel control stays unmounted until a real update feed exists.
    await expect(window.getByRole('radio', { name: /^Stable/u })).toHaveCount(0);
});

test('shows the window after the renderer signals ready over tRPC', async () => {
    await expect
        .poll(() => electronApp.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isVisible()))
        .toBe(true);
});

test('reads runtime facts from the main process through the bridge', async () => {
    const electronVersion = await electronApp.evaluate(() => process.versions.electron);

    await expect(window.getByRole('status').filter({ hasText: 'Main process connected' })).toBeVisible();
    await expect(window.getByRole('complementary', { name: 'Running now' })).toContainText(electronVersion);
});

test('validates playground input and completes a call across the bridge', async () => {
    const message = window.getByLabel('Message for the main process');

    await message.fill('');
    await expect(window.getByText('Write 1 to 120 characters')).toBeVisible();
    await expect(window.getByRole('button', { name: 'Send call' })).toBeDisabled();

    await message.fill('Hello from Playwright');
    await window.getByRole('button', { name: 'Send call' }).click();

    await expect(window.getByRole('log', { name: 'Bridge calls, newest first' })).toContainText(
        'Hello from Playwright'
    );
    await expect(window.getByRole('log', { name: 'Bridge calls, newest first' })).toContainText('Returned');
});

test('keeps hardened window preferences and production devtools disabled', async () => {
    const preferences = await electronApp.evaluate(({ BrowserWindow }) => {
        const mainWindow = BrowserWindow.getAllWindows().find((candidate) => !candidate.isDestroyed());
        const webContents = mainWindow?.webContents as WebContentsWithPreferences | undefined;
        const webPreferences = webContents?.getLastWebPreferences();

        return {
            contextIsolation: webPreferences?.contextIsolation ?? null,
            nodeIntegration: webPreferences?.nodeIntegration ?? null,
            sandbox: webPreferences?.sandbox ?? null,
        };
    });

    expect(preferences).toEqual({
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
    });

    const devToolsOpened = await electronApp.evaluate(async ({ BrowserWindow }) => {
        const mainWindow = BrowserWindow.getAllWindows().find((candidate) => !candidate.isDestroyed());
        const webContents = mainWindow?.webContents;
        webContents?.openDevTools({ activate: false, mode: 'detach' });
        await new Promise((resolve) => setTimeout(resolve, 100));
        return webContents?.isDevToolsOpened() ?? false;
    });

    expect(devToolsOpened).toBe(false);
});

test('serves app assets with a CSP and refuses paths outside the bundle', async () => {
    const responses = await electronApp.evaluate(async ({ net }) => {
        const entry = await net.fetch('app://bundle/index.html');
        const escape = await net.fetch('app://bundle/..%2f..%2fpackage.json');

        return {
            entryStatus: entry.status,
            csp: entry.headers.get('content-security-policy'),
            escapeStatus: escape.status,
        };
    });

    expect(responses.entryStatus).toBe(200);
    expect(responses.csp).toContain("script-src 'self'");
    expect(responses.csp).not.toContain('unsafe-eval');
    expect(responses.escapeStatus).toBe(404);
});

test('denies web permissions the product has not opted into', async () => {
    const state = await window.evaluate(async () => {
        // This project type-checks E2E code without DOM types, so describe the one browser API used here.
        // eslint-disable-next-line n/no-unsupported-features/node-builtins -- Runs in the Chromium renderer, not Node.js.
        const { permissions } = navigator as unknown as {
            permissions: { query: (descriptor: { name: string }) => Promise<{ state: string }> };
        };
        const status = await permissions.query({ name: 'geolocation' });
        return status.state;
    });

    expect(state).toBe('denied');
});
