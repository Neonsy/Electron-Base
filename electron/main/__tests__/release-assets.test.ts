/* eslint-disable security/detect-non-literal-fs-filename --
 * This test invokes one fixed checked-in Node script and confines every dynamic
 * filesystem path to a fresh operating-system temporary directory. */

import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const tempDirectories: string[] = [];

afterEach(async () => {
    await Promise.all(
        tempDirectories.splice(0).map(async (directory) => {
            await rm(directory, { force: true, recursive: true });
        })
    );
});

interface ReleaseFixture {
    artifactNames: string[];
    outputDirectory: string;
    sourceDirectory: string;
    version: string;
}

async function createReleaseFixture(channel: 'latest' | 'beta'): Promise<ReleaseFixture> {
    const version = channel === 'latest' ? '1.2.3' : '1.3.0-beta.1';
    const root = await mkdtemp(path.join(os.tmpdir(), 'electron-release-assets-'));
    const sourceDirectory = path.join(root, 'source');
    const outputDirectory = path.join(root, 'output');
    tempDirectories.push(root);
    await mkdir(sourceDirectory);

    const windowsName = `Electron-Template-${version}-Windows-x64-Setup.exe`;
    const macArchitectures = ['x64', 'arm64', 'universal'] as const;
    const macArtifactNames = macArchitectures.flatMap((architecture) =>
        ['dmg', 'pkg', 'zip'].map((extension) => `Electron-Template-${version}-macOS-${architecture}.${extension}`)
    );
    const macZipNames = macArchitectures.map(
        (architecture) => `Electron-Template-${version}-macOS-${architecture}.zip`
    );
    const universalMacZipName = `Electron-Template-${version}-macOS-universal.zip`;
    const linuxArchitectures = [
        { appImage: 'x86_64', deb: 'amd64', rpm: 'x86_64' },
        { appImage: 'arm64', deb: 'arm64', rpm: 'aarch64' },
    ] as const;
    const linuxArtifactNames = linuxArchitectures.flatMap((architecture) => [
        `Electron-Template-${version}-Linux-${architecture.appImage}.AppImage`,
        `Electron-Template-${version}-Linux-${architecture.deb}.deb`,
        `Electron-Template-${version}-Linux-${architecture.rpm}.rpm`,
    ]);
    const blockmapNames = [windowsName, ...macZipNames].map((name) => `${name}.blockmap`);
    const artifactNames = [windowsName, ...macArtifactNames, ...linuxArtifactNames, ...blockmapNames];

    await Promise.all(
        artifactNames.map(async (name) => {
            await writeFile(path.join(sourceDirectory, name), `fixture:${name}\n`, 'utf8');
        })
    );

    const manifests = new Map([
        [`${channel}.yml`, `version: ${version}\npath: ${windowsName}\n`],
        [
            `${channel}-mac.yml`,
            `version: ${version}\nfiles:\n${macZipNames.map((name) => `  - url: ${name}`).join('\n')}\npath: ${universalMacZipName}\n`,
        ],
        [`${channel}-linux.yml`, `version: ${version}\npath: Electron-Template-${version}-Linux-x86_64.AppImage\n`],
        [
            `${channel}-linux-arm64.yml`,
            `version: ${version}\npath: Electron-Template-${version}-Linux-arm64.AppImage\n`,
        ],
    ]);
    await Promise.all(
        Array.from(manifests, async ([name, contents]) => {
            await writeFile(path.join(sourceDirectory, name), contents, 'utf8');
        })
    );

    return { artifactNames, outputDirectory, sourceDirectory, version };
}

function findFixtureArtifact(fixture: ReleaseFixture, suffix: string): string {
    const fileName = fixture.artifactNames.find((name) => name.endsWith(suffix));
    if (!fileName) {
        throw new Error(`Fixture does not contain an artifact ending in ${suffix}.`);
    }

    return fileName;
}

function checksumFileName(line: string): string {
    const digest = line.slice(0, 64);
    const separator = line.slice(64, 66);
    const fileName = line.slice(66);
    if (!/^[0-9a-f]{64}$/u.test(digest) || separator !== '  ' || !fileName) {
        throw new Error(`Invalid SHA256SUMS entry: ${line}`);
    }

    return fileName;
}

function runAssetPreparation(fixture: ReleaseFixture, channel: 'latest' | 'beta') {
    return spawnSync(process.execPath, ['scripts/release/prepare-assets.mjs'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
            ...process.env,
            RELEASE_ASSET_OUTPUT: fixture.outputDirectory,
            RELEASE_ASSET_SOURCE: fixture.sourceDirectory,
            RELEASE_VERSION: fixture.version,
            UPDATE_CHANNEL: channel,
        },
    });
}

describe('release asset preparation', () => {
    it.each(['latest', 'beta'] as const)('accepts the complete %s direct-download inventory', async (channel) => {
        const fixture = await createReleaseFixture(channel);
        const result = runAssetPreparation(fixture, channel);

        expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
        const outputNames = await readdir(fixture.outputDirectory);
        expect(outputNames.sort()).toEqual(
            [
                ...fixture.artifactNames,
                `${channel}.yml`,
                `${channel}-linux.yml`,
                `${channel}-linux-arm64.yml`,
                `${channel}-mac.yml`,
                'SHA256SUMS.txt',
            ].sort()
        );

        const checksums = await readFile(path.join(fixture.outputDirectory, 'SHA256SUMS.txt'), 'utf8');
        const checksummedNames = checksums.trim().split('\n').map(checksumFileName).sort();
        const publishedNames = outputNames.filter((name) => name !== 'SHA256SUMS.txt').sort();
        expect(checksummedNames).toEqual(publishedNames);
    });

    it.each([
        ['macOS arm64 PKG', '-macOS-arm64.pkg'],
        ['Linux arm64 RPM', '-Linux-aarch64.rpm'],
    ] as const)('rejects publication when the required %s is missing', async (description, suffix) => {
        const fixture = await createReleaseFixture('latest');
        await unlink(path.join(fixture.sourceDirectory, findFixtureArtifact(fixture, suffix)));

        const result = runAssetPreparation(fixture, 'latest');

        expect(result.status).not.toBe(0);
        expect(`${result.stdout}\n${result.stderr}`).toContain(`Missing required release target: ${description}`);
    });

    it('rejects publication when an architecture-specific Linux manifest is missing', async () => {
        const fixture = await createReleaseFixture('latest');
        await unlink(path.join(fixture.sourceDirectory, 'latest-linux-arm64.yml'));

        const result = runAssetPreparation(fixture, 'latest');

        expect(result.status).not.toBe(0);
        expect(`${result.stdout}\n${result.stderr}`).toContain(
            'Missing required update manifest: latest-linux-arm64.yml'
        );
    });

    it('rejects a macOS manifest that omits an updater architecture', async () => {
        const fixture = await createReleaseFixture('latest');
        const universalZip = findFixtureArtifact(fixture, '-macOS-universal.zip');
        await writeFile(
            path.join(fixture.sourceDirectory, 'latest-mac.yml'),
            `version: ${fixture.version}\npath: ${universalZip}\n`,
            'utf8'
        );

        const result = runAssetPreparation(fixture, 'latest');

        expect(result.status).not.toBe(0);
        expect(`${result.stdout}\n${result.stderr}`).toContain(
            `latest-mac.yml does not reference required updater asset: Electron-Template-${fixture.version}-macOS-x64.zip`
        );
    });
});
