import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const UPDATE_CHANNEL_PREFERENCE_FILENAME = 'update-channel.json';

export type UpdateChannel = 'stable' | 'beta';

export type UpdateChannelPreference =
    { kind: 'stored'; channel: UpdateChannel } | { kind: 'missing' } | { kind: 'invalid' };

export interface ResolvedUpdateChannelPreference {
    channel: UpdateChannel;
    source: UpdateChannelPreference['kind'];
}

export interface UpdateChannelTarget {
    channel: string | null;
    allowPrerelease: boolean;
    allowDowngrade: boolean;
}

const PREFERENCE_SCHEMA_VERSION = 1;
const CANONICAL_BETA_VERSION =
    /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-beta\.[1-9]\d*(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function isUpdateChannel(value: unknown): value is UpdateChannel {
    return value === 'stable' || value === 'beta';
}

export function inferUpdateChannel(installedVersion: string): UpdateChannel {
    return CANONICAL_BETA_VERSION.test(installedVersion) ? 'beta' : 'stable';
}

function resolveUpdateChannel(preference: UpdateChannelPreference, installedVersion: string): UpdateChannel {
    return preference.kind === 'stored' ? preference.channel : inferUpdateChannel(installedVersion);
}

export function toUpdaterChannel(channel: UpdateChannel): 'latest' | 'beta' {
    return channel === 'beta' ? 'beta' : 'latest';
}

/**
 * Assignment order matters: electron-updater can enable downgrades when its
 * channel changes, so allowDowngrade must be reset after the channel setter.
 */
export function applyUpdateChannel(target: UpdateChannelTarget, channel: UpdateChannel): void {
    target.channel = toUpdaterChannel(channel);
    target.allowPrerelease = channel === 'beta';
    target.allowDowngrade = false;
}

export function readUpdateChannelPreference(filePath: string): UpdateChannelPreference {
    let contents: string;

    try {
        contents = readFileSync(filePath, 'utf8');
    } catch (error: unknown) {
        if (isNodeError(error) && error.code === 'ENOENT') {
            return { kind: 'missing' };
        }

        throw new Error(`Unable to read the update channel preference at ${filePath}.`, { cause: error });
    }

    try {
        const value: unknown = JSON.parse(contents);

        if (!isPreferenceDocument(value)) {
            return { kind: 'invalid' };
        }

        return { kind: 'stored', channel: value.channel };
    } catch (error: unknown) {
        if (error instanceof SyntaxError) {
            return { kind: 'invalid' };
        }

        throw error;
    }
}

export async function loadOrSeedUpdateChannel(
    filePath: string,
    installedVersion: string
): Promise<ResolvedUpdateChannelPreference> {
    const preference = readUpdateChannelPreference(filePath);
    const channel = resolveUpdateChannel(preference, installedVersion);

    if (preference.kind !== 'stored') {
        await writeUpdateChannelPreference(filePath, channel);
    }

    return { channel, source: preference.kind };
}

export async function writeUpdateChannelPreference(filePath: string, channel: UpdateChannel): Promise<void> {
    const directory = path.dirname(filePath);
    const temporaryPath = path.join(
        directory,
        `.${path.basename(filePath)}.${String(process.pid)}.${randomUUID()}.tmp`
    );
    const contents = `${JSON.stringify({ version: PREFERENCE_SCHEMA_VERSION, channel }, null, 2)}\n`;

    try {
        await mkdir(directory, { recursive: true });
        await writeFile(temporaryPath, contents, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
        await rename(temporaryPath, filePath);
    } catch (error: unknown) {
        await removeTemporaryFile(temporaryPath);
        throw new Error(`Unable to persist the update channel preference at ${filePath}.`, { cause: error });
    }
}

function isPreferenceDocument(value: unknown): value is { version: 1; channel: UpdateChannel } {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);

    return (
        keys.length === 2 &&
        keys.includes('version') &&
        keys.includes('channel') &&
        record['version'] === PREFERENCE_SCHEMA_VERSION &&
        isUpdateChannel(record['channel'])
    );
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
    return error instanceof Error && 'code' in error;
}

async function removeTemporaryFile(filePath: string): Promise<void> {
    try {
        await unlink(filePath);
    } catch (error: unknown) {
        if (!isNodeError(error) || error.code !== 'ENOENT') {
            console.warn(`[updater] Unable to remove temporary channel preference file: ${filePath}`, error);
        }
    }
}
