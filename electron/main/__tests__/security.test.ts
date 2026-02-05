import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { APP_ENTRY_URL, getAssetContentType, resolveAppAssetPath } from '@/app/main/protocol/assetPath';
import { isAppNavigation, isSafeExternalUrl } from '@/app/main/security/urlPolicy';

describe('isSafeExternalUrl', () => {
    it('allows http, https, and mailto', () => {
        expect(isSafeExternalUrl('https://example.com')).toBe(true);
        expect(isSafeExternalUrl('http://example.com')).toBe(true);
        expect(isSafeExternalUrl('mailto:hello@example.com')).toBe(true);
    });

    it('blocks non-allowlisted protocols', () => {
        expect(isSafeExternalUrl('file:///C:/secret.txt')).toBe(false);
        expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
        expect(isSafeExternalUrl('custom://app')).toBe(false);
    });
});

describe('isAppNavigation', () => {
    it('accepts dev server origin in dev', () => {
        expect(isAppNavigation('http://localhost:5173/#/', 'http://localhost:5173')).toBe(true);
        expect(isAppNavigation('http://localhost:5174/#/', 'http://localhost:5173')).toBe(false);
    });

    it('accepts only the app:// bundle host in production', () => {
        expect(isAppNavigation(`${APP_ENTRY_URL}#/settings`, APP_ENTRY_URL)).toBe(true);
        expect(isAppNavigation('app://bundle/assets/index.js', APP_ENTRY_URL)).toBe(true);
        expect(isAppNavigation('app://other/index.html', APP_ENTRY_URL)).toBe(false);
        expect(isAppNavigation('custom://bundle/index.html', APP_ENTRY_URL)).toBe(false);
        expect(isAppNavigation('file:///C:/downloads/untrusted.html', APP_ENTRY_URL)).toBe(false);
        expect(isAppNavigation('https://example.com', APP_ENTRY_URL)).toBe(false);
    });

    it('never treats an app URL without a host as trusted', () => {
        expect(isAppNavigation('file:///C:/other.html', 'file:///C:/app/index.html')).toBe(false);
    });
});

describe('resolveAppAssetPath', () => {
    const root = path.resolve('fixture-dist');

    it('serves the entry document for the root URL', () => {
        expect(resolveAppAssetPath('app://bundle/', root)).toBe(path.join(root, 'index.html'));
        expect(resolveAppAssetPath(APP_ENTRY_URL, root)).toBe(path.join(root, 'index.html'));
    });

    it('serves nested assets and ignores query strings and hashes', () => {
        expect(resolveAppAssetPath('app://bundle/assets/index-abc.js?v=1#x', root)).toBe(
            path.join(root, 'assets', 'index-abc.js')
        );
    });

    it('keeps URL-normalized parent segments inside the root', () => {
        expect(resolveAppAssetPath('app://bundle/%2e%2e/%2e%2e/secret.txt', root)).toBe(path.join(root, 'secret.txt'));
    });

    it.each([
        ['another host', 'app://elsewhere/index.html'],
        ['another scheme', 'https://bundle/index.html'],
        ['encoded separators', 'app://bundle/..%2f..%2fsecret.txt'],
        ['encoded backslashes', 'app://bundle/..%5c..%5csecret.txt'],
        ['a null byte', 'app://bundle/index.html%00.js'],
        ['malformed escapes', 'app://bundle/%E0%A4%A'],
        ['an invalid URL', 'not a url'],
    ])('rejects %s', (_description, url) => {
        expect(resolveAppAssetPath(url, root)).toBeNull();
    });

    it('labels common asset types', () => {
        expect(getAssetContentType('index.html')).toBe('text/html; charset=utf-8');
        expect(getAssetContentType('app.JS')).toBe('text/javascript; charset=utf-8');
        expect(getAssetContentType('font.woff2')).toBe('font/woff2');
        expect(getAssetContentType('unknown.bin')).toBe('application/octet-stream');
    });
});
