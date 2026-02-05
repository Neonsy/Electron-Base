import electron from 'electron';

const { session } = electron;

/**
 * Electron grants every web permission (camera, geolocation, notifications, ...) unless the app
 * decides otherwise. The template denies all of them except writing sanitized text to the
 * clipboard. Add a permission here only when a product feature needs it.
 */
export const ALLOWED_PERMISSIONS: ReadonlySet<string> = new Set(['clipboard-sanitized-write']);

export function hardenDefaultSession(): void {
    const { defaultSession } = session;

    defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
        callback(ALLOWED_PERMISSIONS.has(permission));
    });

    defaultSession.setPermissionCheckHandler((_webContents, permission) => ALLOWED_PERMISSIONS.has(permission));
}
