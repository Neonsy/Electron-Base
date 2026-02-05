import electron from 'electron';
import { readFile } from 'node:fs/promises';

import { APP_SCHEME, getAssetContentType, resolveAppAssetPath } from '@/app/main/protocol/assetPath';

const { protocol } = electron;

/**
 * Must run before the app is ready. A standard, secure scheme gives the renderer a real origin
 * (`app://bundle`), so CSP `'self'`, fetch, and storage behave as they would on https and the
 * legacy `file://` privileges fuse can stay disabled.
 */
export function registerAppSchemePrivileges(): void {
    protocol.registerSchemesAsPrivileged([
        {
            scheme: APP_SCHEME,
            privileges: {
                standard: true,
                secure: true,
                supportFetchAPI: true,
                codeCache: true,
            },
        },
    ]);
}

export interface AppProtocolOptions {
    /** Directory containing the built renderer (`dist`). */
    rendererRoot: string;
    contentSecurityPolicy: string;
}

/** Serves the packaged renderer from `app://bundle/`. Call once after the app is ready. */
export function handleAppProtocol(options: AppProtocolOptions): void {
    const { rendererRoot, contentSecurityPolicy } = options;

    protocol.handle(APP_SCHEME, async (request) => {
        const filePath = resolveAppAssetPath(request.url, rendererRoot);

        if (!filePath || (request.method !== 'GET' && request.method !== 'HEAD')) {
            return new Response('Not found', { status: 404 });
        }

        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename -- resolveAppAssetPath confines the path to the renderer build directory.
            const contents = await readFile(filePath);

            return new Response(request.method === 'HEAD' ? null : contents, {
                headers: {
                    'Content-Type': getAssetContentType(filePath),
                    'Content-Security-Policy': contentSecurityPolicy,
                    'X-Content-Type-Options': 'nosniff',
                },
            });
        } catch {
            return new Response('Not found', { status: 404 });
        }
    });
}
