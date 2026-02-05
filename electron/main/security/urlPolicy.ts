const SAFE_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export function isSafeExternalUrl(rawUrl: string): boolean {
    try {
        const parsed = new URL(rawUrl);
        return SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol);
    } catch {
        return false;
    }
}

/**
 * True when a URL belongs to the app's own origin: the dev server in development and
 * `app://bundle` in production. Scheme and host are compared explicitly because Node reports
 * the opaque origin "null" for custom schemes, which would make every custom URL match.
 */
export function isAppNavigation(rawUrl: string, appUrl: string): boolean {
    try {
        const target = new URL(rawUrl);
        const app = new URL(appUrl);

        if (!app.host) {
            return false;
        }

        return target.protocol === app.protocol && target.host === app.host;
    } catch {
        return false;
    }
}
