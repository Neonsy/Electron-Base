import path from 'node:path';

export const APP_SCHEME = 'app';
export const APP_HOST = 'bundle';
export const APP_ENTRY_URL = `${APP_SCHEME}://${APP_HOST}/index.html`;

const CONTENT_TYPES = new Map([
    ['.html', 'text/html; charset=utf-8'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.mjs', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
    ['.map', 'application/json; charset=utf-8'],
    ['.svg', 'image/svg+xml'],
    ['.png', 'image/png'],
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.gif', 'image/gif'],
    ['.webp', 'image/webp'],
    ['.avif', 'image/avif'],
    ['.ico', 'image/x-icon'],
    ['.woff', 'font/woff'],
    ['.woff2', 'font/woff2'],
    ['.ttf', 'font/ttf'],
    ['.otf', 'font/otf'],
    ['.mp3', 'audio/mpeg'],
    ['.ogg', 'audio/ogg'],
    ['.wav', 'audio/wav'],
    ['.mp4', 'video/mp4'],
    ['.webm', 'video/webm'],
    ['.wasm', 'application/wasm'],
    ['.txt', 'text/plain; charset=utf-8'],
]);

/**
 * Maps an `app://bundle/...` URL to a file inside the renderer build directory.
 * Returns null for another host, a malformed path, or any path that escapes the root.
 */
export function resolveAppAssetPath(requestUrl: string, rendererRoot: string): string | null {
    let url: URL;

    try {
        url = new URL(requestUrl);
    } catch {
        return null;
    }

    if (url.protocol !== `${APP_SCHEME}:` || url.host !== APP_HOST) {
        return null;
    }

    let pathname: string;
    try {
        pathname = decodeURIComponent(url.pathname);
    } catch {
        return null;
    }

    // Backslashes are separators on Windows only; reject them everywhere for identical behavior.
    if (pathname.includes('\0') || pathname.includes('\\')) {
        return null;
    }

    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/u, '');
    const root = path.resolve(rendererRoot);
    const filePath = path.resolve(root, relativePath);
    const fromRoot = path.relative(root, filePath);

    if (!fromRoot || fromRoot.startsWith('..') || path.isAbsolute(fromRoot)) {
        return null;
    }

    return filePath;
}

export function getAssetContentType(filePath: string): string {
    return CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream';
}
