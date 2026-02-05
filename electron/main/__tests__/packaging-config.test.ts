import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// eslint-disable-next-line no-restricted-imports -- This test deliberately imports the executable root build config.
import builderConfig from '../../../electron-builder.config';

interface PackageMetadata {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    main: string;
}

function readPackageMetadata(): PackageMetadata {
    return JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as PackageMetadata;
}

describe('desktop build config', () => {
    it('keeps the packaged entry point and updater available at runtime', () => {
        const metadata = readPackageMetadata();

        expect(metadata.main).toBe('dist-electron/index.js');
        expect(metadata.dependencies['electron-updater']).toBeDefined();
        expect(metadata.devDependencies['electron-updater']).toBeUndefined();
    });

    it('defines collision-safe packages for every supported architecture', () => {
        expect(builderConfig.win?.target).toEqual([{ target: 'nsis', arch: ['x64'] }]);
        expect(builderConfig.mac?.target).toEqual([
            { target: 'dmg', arch: ['x64', 'arm64', 'universal'] },
            { target: 'pkg', arch: ['x64', 'arm64', 'universal'] },
            { target: 'zip', arch: ['x64', 'arm64', 'universal'] },
        ]);
        expect(builderConfig.linux?.target).toEqual([
            { target: 'AppImage', arch: ['x64', 'arm64'] },
            { target: 'deb', arch: ['x64', 'arm64'] },
            { target: 'rpm', arch: ['x64', 'arm64'] },
        ]);

        const artifactPatterns = [
            builderConfig.win?.artifactName,
            builderConfig.mac?.artifactName,
            builderConfig.linux?.artifactName,
        ].filter((pattern): pattern is string => typeof pattern === 'string');

        expect(artifactPatterns).toHaveLength(3);
        expect(new Set(artifactPatterns).size).toBe(3);
        for (const pattern of artifactPatterns) {
            expect(pattern).toContain('${version}');
            expect(pattern).toContain('${arch}');
            expect(pattern).toContain('${ext}');
        }
    });

    it('keeps publication, signing, archive integrity, and uninstall data boundaries explicit', () => {
        expect(builderConfig.publish).toEqual([
            expect.objectContaining({
                provider: 'github',
                protocol: 'https',
            }),
        ]);
        expect(builderConfig.asar).toBe(true);
        expect(builderConfig.mac?.hardenedRuntime).toBe(true);
        expect(builderConfig.win?.signAndEditExecutable).toBe(true);
        expect(builderConfig.nsis?.deleteAppDataOnUninstall).toBe(false);
        expect(builderConfig.electronFuses).toMatchObject({
            runAsNode: false,
            enableCookieEncryption: true,
            enableNodeOptionsEnvironmentVariable: false,
            enableNodeCliInspectArguments: false,
            enableEmbeddedAsarIntegrityValidation: true,
            onlyLoadAppFromAsar: true,
            grantFileProtocolExtraPrivileges: false,
        });
    });
});
