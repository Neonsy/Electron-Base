import { describe, expect, it } from 'vitest';

import { buildCspPolicy } from '@/app/main/security/cspPolicy';

describe('buildCspPolicy', () => {
    it('includes dev server http and ws origins', () => {
        const policy = buildCspPolicy('dev', { devServerUrl: 'http://127.0.0.1:5173' });
        const connectSrc = policy['connect-src'] ?? [];

        expect(connectSrc).toContain('http://127.0.0.1:5173');
        expect(connectSrc).toContain('ws://127.0.0.1:5173');
    });

    it('keeps the production document and script boundary local and non-executable', () => {
        const policy = buildCspPolicy('prod');
        const scriptSrc = policy['script-src'] ?? [];

        expect(scriptSrc).not.toContain("'unsafe-inline'");
        expect(scriptSrc).not.toContain("'unsafe-eval'");
        expect(policy['object-src']).toEqual(["'none'"]);
        expect(policy['frame-ancestors']).toEqual(["'none'"]);
        expect(policy['base-uri']).toEqual(["'self'"]);
        expect(policy['style-src']).not.toContain('https://fonts.googleapis.com');
        expect(policy['font-src']).not.toContain('https://fonts.gstatic.com');
    });
});
