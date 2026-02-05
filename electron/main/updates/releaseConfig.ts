export type PublishChannel = 'latest' | 'beta';

export interface PackageMetadata {
    repository?: string | { url?: string };
    version?: string;
}

const STABLE_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const BETA_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-beta\.([1-9]\d*)$/u;

export function resolvePublishChannel(version: string, override?: string): PublishChannel {
    const inferredChannel = STABLE_VERSION.test(version) ? 'latest' : BETA_VERSION.test(version) ? 'beta' : null;

    if (!inferredChannel) {
        throw new Error(
            `Unsupported package version "${version}". Use X.Y.Z for stable or X.Y.Z-beta.N for beta releases.`
        );
    }

    const requestedChannel = override?.trim() || inferredChannel;
    if (requestedChannel !== 'latest' && requestedChannel !== 'beta') {
        throw new Error(`Unsupported UPDATE_CHANNEL "${requestedChannel}". Use "latest" or "beta".`);
    }

    if (requestedChannel !== inferredChannel) {
        throw new Error(
            `UPDATE_CHANNEL "${requestedChannel}" does not match package version "${version}" (${inferredChannel}).`
        );
    }

    return requestedChannel;
}

export function resolveGitHubRepository(repository: PackageMetadata['repository']): { owner: string; repo: string } {
    const rawUrl = typeof repository === 'string' ? repository : repository?.url;
    if (!rawUrl) {
        throw new Error('package.json repository.url must point to the public GitHub update repository.');
    }

    const url = new URL(rawUrl);
    const pathParts = url.pathname
        .replace(/\.git$/u, '')
        .split('/')
        .filter(Boolean);

    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || pathParts.length !== 2) {
        throw new Error('package.json repository.url must use https://github.com/<owner>/<repo>.git.');
    }

    const [owner, repo] = pathParts;
    if (!owner || !repo) {
        throw new Error('package.json repository.url must include a GitHub owner and repository.');
    }

    return { owner, repo };
}
