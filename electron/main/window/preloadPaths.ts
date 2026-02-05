import path from 'node:path';

export const MAIN_WINDOW_PRELOAD_BUNDLE_NAME = 'mainWindow.cjs';

export function resolveMainWindowPreloadPath(mainDirname: string): string {
    return path.join(mainDirname, MAIN_WINDOW_PRELOAD_BUNDLE_NAME);
}
