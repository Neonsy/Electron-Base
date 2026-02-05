import electron from 'electron';

import { getCspHeader } from '@/app/main/security/cspPolicy';

const { session } = electron;

/**
 * Development only: adds the dev CSP to documents served by the Vite dev server.
 * Production responses carry their CSP directly from the app:// protocol handler.
 */
export function attachDevServerCspHeaders(devServerUrl: string): void {
    const cspHeader = getCspHeader('dev', { devServerUrl });

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        if (!details.url.startsWith(devServerUrl)) {
            callback({});
            return;
        }

        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [cspHeader],
            },
        });
    });
}
