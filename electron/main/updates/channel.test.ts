import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
    applyUpdateChannel,
    inferUpdateChannel,
    loadOrSeedUpdateChannel,
    readUpdateChannelPreference,
    writeUpdateChannelPreference,
    type UpdateChannelTarget,
} from '@/app/main/updates/channel';

const temporaryDirectories: string[] = [];

afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe('update channel inference', () => {
    it.each([
        ['1.2.3-beta.1', 'beta'],
        ['1.2.3-beta.0', 'stable'],
        ['1.2.3-beta.1.next', 'stable'],
        ['1.2.3-canary.1', 'stable'],
        ['1.2.3', 'stable'],
    ] as const)('infers %s as %s', (version, expected) => {
        expect(inferUpdateChannel(version)).toBe(expected);
    });
});

describe('update channel persistence', () => {
    it('seeds a missing preference from the installed beta version', async () => {
        const directory = await createTemporaryDirectory();
        const preferencePath = path.join(directory, 'update-channel.json');

        await expect(loadOrSeedUpdateChannel(preferencePath, '1.2.3-beta.7')).resolves.toEqual({
            channel: 'beta',
            source: 'missing',
        });
        expect(readUpdateChannelPreference(preferencePath)).toEqual({ kind: 'stored', channel: 'beta' });
    });

    it('atomically replaces an invalid preference with the safely inferred channel', async () => {
        const directory = await createTemporaryDirectory();
        const preferencePath = path.join(directory, 'update-channel.json');
        await writeFile(preferencePath, '{"version":1,"channel":"canary"}', 'utf8');

        await expect(loadOrSeedUpdateChannel(preferencePath, '1.2.3')).resolves.toEqual({
            channel: 'stable',
            source: 'invalid',
        });
        expect(readUpdateChannelPreference(preferencePath)).toEqual({ kind: 'stored', channel: 'stable' });
    });

    it('keeps a valid stored choice when the installed version implies another channel', async () => {
        const directory = await createTemporaryDirectory();
        const preferencePath = path.join(directory, 'update-channel.json');
        await writeUpdateChannelPreference(preferencePath, 'stable');

        await expect(loadOrSeedUpdateChannel(preferencePath, '1.2.3-beta.7')).resolves.toEqual({
            channel: 'stable',
            source: 'stored',
        });
        expect(readUpdateChannelPreference(preferencePath)).toEqual({ kind: 'stored', channel: 'stable' });
    });

    it('creates nested directories, replaces the preference, and removes temporary files', async () => {
        const directory = await createTemporaryDirectory();
        const preferencePath = path.join(directory, 'nested', 'update-channel.json');

        await writeUpdateChannelPreference(preferencePath, 'beta');
        expect(readUpdateChannelPreference(preferencePath)).toEqual({ kind: 'stored', channel: 'beta' });

        await writeUpdateChannelPreference(preferencePath, 'stable');
        expect(readUpdateChannelPreference(preferencePath)).toEqual({ kind: 'stored', channel: 'stable' });
        const remainingFiles = await readdir(path.dirname(preferencePath));
        expect(remainingFiles).toContain('update-channel.json');
        expect(remainingFiles.some((fileName) => fileName.endsWith('.tmp'))).toBe(false);
    });

    it.each([
        ['malformed JSON', '{'],
        ['unknown schema version', '{"version":2,"channel":"stable"}'],
        ['unexpected fields', '{"version":1,"channel":"stable","extra":true}'],
    ])('treats %s as invalid data', async (_caseName, contents) => {
        const directory = await createTemporaryDirectory();
        const preferencePath = path.join(directory, 'update-channel.json');
        await writeFile(preferencePath, contents, 'utf8');

        expect(readUpdateChannelPreference(preferencePath)).toEqual({ kind: 'invalid' });
    });
});

describe('electron-updater channel application', () => {
    it.each([
        ['stable', 'latest', false],
        ['beta', 'beta', true],
    ] as const)('maps %s and leaves downgrade disabled', (channel, providerChannel, allowPrerelease) => {
        const target = createUpdaterTarget();

        applyUpdateChannel(target, channel);

        expect(target.channel).toBe(providerChannel);
        expect(target.allowPrerelease).toBe(allowPrerelease);
        expect(target.allowDowngrade).toBe(false);
    });
});

async function createTemporaryDirectory(): Promise<string> {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'electron-base-update-channel-'));
    temporaryDirectories.push(directory);
    return directory;
}

function createUpdaterTarget(): UpdateChannelTarget {
    let channel: string | null = null;
    let allowPrerelease = false;
    let allowDowngrade = true;

    return {
        get channel() {
            return channel;
        },
        set channel(value) {
            channel = value;
            // electron-updater can re-enable downgrades as a side effect of changing channels.
            allowDowngrade = true;
        },
        get allowPrerelease() {
            return allowPrerelease;
        },
        set allowPrerelease(value) {
            allowPrerelease = value;
        },
        get allowDowngrade() {
            return allowDowngrade;
        },
        set allowDowngrade(value) {
            allowDowngrade = value;
        },
    };
}
