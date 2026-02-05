import { appendFile, readFile } from 'node:fs/promises';

const tagPattern = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-beta\.([1-9]\d*))?$/u;
const placeholderRepository = 'example-owner/example-electron-app';

function requiredEnvironment(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

function normalizeRepository(repository) {
    const configuredUrl =
        typeof repository === 'string'
            ? repository
            : repository && typeof repository === 'object' && typeof repository.url === 'string'
              ? repository.url
              : '';

    const value = configuredUrl.trim().replace(/^git\+/u, '');
    if (!value) {
        throw new Error('package.json must define a GitHub repository URL.');
    }

    let url;
    try {
        url = new URL(value);
    } catch {
        throw new Error(`Unsupported package repository URL: ${configuredUrl}`);
    }

    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com') {
        throw new Error(`Release repository must use https://github.com, received: ${configuredUrl}`);
    }

    const slug = url.pathname.replace(/^\/+|\/+$/gu, '').replace(/\.git$/u, '');
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(slug)) {
        throw new Error(`Could not derive an owner/repository slug from: ${configuredUrl}`);
    }

    return slug;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

const releaseTag = requiredEnvironment('RELEASE_TAG');
const expectedRepository = requiredEnvironment('EXPECTED_REPOSITORY');
const defaultBranch = requiredEnvironment('DEFAULT_BRANCH');
const refName = requiredEnvironment('REF_NAME');
const refType = requiredEnvironment('REF_TYPE');
const sourceSha = requiredEnvironment('SOURCE_SHA');
const outputFile = requiredEnvironment('GITHUB_OUTPUT');

const match = tagPattern.exec(releaseTag);
if (!match) {
    throw new Error(`Invalid release tag "${releaseTag}". Use vX.Y.Z for stable or vX.Y.Z-beta.N for beta releases.`);
}

if (refType !== 'branch' || refName !== defaultBranch) {
    throw new Error(`Releases must run from the default branch "${defaultBranch}", received ${refType} "${refName}".`);
}

if (!/^[0-9a-f]{40}$/u.test(sourceSha)) {
    throw new Error(`Invalid source commit SHA: ${sourceSha}`);
}

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const version = releaseTag.slice(1);
if (packageJson.version !== version) {
    throw new Error(
        `package.json version "${String(packageJson.version)}" does not match release tag "${releaseTag}".`
    );
}

const configuredRepository = normalizeRepository(packageJson.repository);
if (configuredRepository.toLowerCase() === placeholderRepository) {
    throw new Error(
        `Replace the template repository URL https://github.com/${placeholderRepository} before releasing.`
    );
}

if (configuredRepository.toLowerCase() !== expectedRepository.toLowerCase()) {
    throw new Error(
        `package.json repository "${configuredRepository}" does not match this workflow repository "${expectedRepository}".`
    );
}

const changelog = await readFile('CHANGELOG.md', 'utf8');
const releaseHeading = new RegExp(`^## \\[${escapeRegExp(version)}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'gmu');
const releaseHeadingCount = Array.from(changelog.matchAll(releaseHeading)).length;
if (releaseHeadingCount !== 1) {
    throw new Error(
        `CHANGELOG.md must contain exactly one dated "## [${version}]" section before releasing; found ${releaseHeadingCount}.`
    );
}

const isPrerelease = match[4] !== undefined;
const outputs = {
    tag: releaseTag,
    version,
    channel: isPrerelease ? 'beta' : 'latest',
    is_prerelease: String(isPrerelease),
    source_sha: sourceSha,
};

await appendFile(
    outputFile,
    Object.entries(outputs)
        .map(([name, value]) => `${name}=${value}\n`)
        .join(''),
    'utf8'
);

console.log(`Validated ${releaseTag} from ${configuredRepository}@${sourceSha}.`);
console.log(`Release channel: ${outputs.channel}; prerelease: ${outputs.is_prerelease}.`);
