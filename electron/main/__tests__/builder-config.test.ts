import { describe, expect, it } from 'vitest';

import { resolveGitHubRepository, resolvePublishChannel } from '@/app/main/updates/releaseConfig';

describe('release channel configuration', () => {
    it.each([
        ['1.2.3', undefined, 'latest'],
        ['1.2.3', 'latest', 'latest'],
        ['1.2.3-beta.1', undefined, 'beta'],
        ['1.2.3-beta.42', 'beta', 'beta'],
    ] as const)('maps version %s and override %s to %s', (version, override, expected) => {
        expect(resolvePublishChannel(version, override)).toBe(expected);
    });

    it.each(['v1.2.3', '01.2.3', '1.2.3-beta.0', '1.2.3-alpha.1', '1.2.3+build.1'])(
        'rejects unsupported version %s',
        (version) => {
            expect(() => resolvePublishChannel(version)).toThrow('Unsupported package version');
        }
    );

    it('rejects an explicit channel that disagrees with the version', () => {
        expect(() => resolvePublishChannel('1.2.3', 'beta')).toThrow('does not match package version');
        expect(() => resolvePublishChannel('1.2.3-beta.1', 'latest')).toThrow('does not match package version');
    });

    it('derives the public GitHub provider coordinates from package metadata', () => {
        expect(resolveGitHubRepository({ url: 'https://github.com/example-owner/example-app.git' })).toEqual({
            owner: 'example-owner',
            repo: 'example-app',
        });
    });

    it.each([
        undefined,
        'git@github.com:example-owner/example-app.git',
        'http://github.com/example-owner/example-app.git',
        'https://gitlab.com/example-owner/example-app.git',
        'https://github.com/example-owner/nested/example-app.git',
    ])('rejects unsupported repository metadata %s', (repository) => {
        expect(() => resolveGitHubRepository(repository)).toThrow();
    });
});
