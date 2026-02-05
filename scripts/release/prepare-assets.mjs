import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

function requiredEnvironment(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

async function walk(directory) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await walk(entryPath)));
        } else if (entry.isFile()) {
            files.push(entryPath);
        } else {
            throw new Error(`Release artifacts may not contain links or special files: ${entryPath}`);
        }
    }

    return files;
}

function isPublishable(fileName, manifests) {
    if (manifests.has(fileName)) {
        return true;
    }

    return /\.(?:exe|dmg|pkg|zip|AppImage|deb|rpm|blockmap)$/u.test(fileName);
}

function safeFileName(fileName) {
    return /^[A-Za-z0-9][A-Za-z0-9._+-]*$/u.test(fileName) && path.basename(fileName) === fileName;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function manifestAssetNames(contents) {
    const assets = new Set();

    for (const line of contents.split(/\r?\n/u)) {
        const match = line.match(/^\s*(?:-\s*)?(?:url|path):\s*(.+?)\s*$/u);
        if (!match) {
            continue;
        }

        const scalar = match[1];
        if (!scalar) {
            throw new Error('Update manifest contains an empty asset reference.');
        }

        const first = scalar.at(0);
        const last = scalar.at(-1);
        const fileName =
            first === "'" && last === "'"
                ? scalar.slice(1, -1).replaceAll("''", "'")
                : first === '"' && last === '"'
                  ? JSON.parse(scalar)
                  : scalar;

        if (typeof fileName !== 'string' || !safeFileName(fileName)) {
            throw new Error(`Unsafe update manifest asset reference: ${scalar}`);
        }

        assets.add(fileName);
    }

    return assets;
}

async function sha256(file) {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(file)) {
        hash.update(chunk);
    }

    return hash.digest('hex');
}

const sourceDirectory = path.resolve(requiredEnvironment('RELEASE_ASSET_SOURCE'));
const outputDirectory = path.resolve(requiredEnvironment('RELEASE_ASSET_OUTPUT'));
const channel = requiredEnvironment('UPDATE_CHANNEL');
const version = requiredEnvironment('RELEASE_VERSION');

if (channel !== 'latest' && channel !== 'beta') {
    throw new Error(`Unsupported update channel: ${channel}`);
}

if ((await stat(sourceDirectory)).isDirectory() === false) {
    throw new Error(`Release artifact source is not a directory: ${sourceDirectory}`);
}

await mkdir(outputDirectory, { recursive: false });
const expectedManifests = new Set([
    `${channel}.yml`,
    `${channel}-mac.yml`,
    `${channel}-linux.yml`,
    `${channel}-linux-arm64.yml`,
]);
const selected = [];
const names = new Set();
const manifestReferences = new Map();
const manifestAssets = new Map();

for (const sourceFile of await walk(sourceDirectory)) {
    const fileName = path.basename(sourceFile);
    if (!isPublishable(fileName, expectedManifests)) {
        continue;
    }

    if (!safeFileName(fileName)) {
        throw new Error(`Unsafe release artifact filename: ${fileName}`);
    }

    if (names.has(fileName)) {
        throw new Error(`Duplicate release artifact filename: ${fileName}`);
    }

    if (expectedManifests.has(fileName)) {
        const manifest = await readFile(sourceFile, 'utf8');
        const versionLine = new RegExp(`^version:\\s*["']?${escapeRegExp(version)}["']?\\s*$`, 'mu');
        if (!versionLine.test(manifest)) {
            throw new Error(`${fileName} does not declare expected version ${version}.`);
        }

        const assetNames = manifestAssetNames(manifest);
        manifestAssets.set(fileName, assetNames);
        for (const assetName of assetNames) {
            manifestReferences.set(assetName, fileName);
        }
    }

    names.add(fileName);
    selected.push({ fileName, sourceFile });
}

for (const manifest of expectedManifests) {
    if (!names.has(manifest)) {
        throw new Error(`Missing required update manifest: ${manifest}`);
    }
}

for (const [assetName, manifest] of manifestReferences) {
    if (!names.has(assetName)) {
        throw new Error(`${manifest} references missing release asset: ${assetName}`);
    }
}

const releaseFile = (suffix) => `Electron-Template-${version}-${suffix}`;
const expectedManifestAssets = new Map([
    [`${channel}.yml`, [releaseFile('Windows-x64-Setup.exe')]],
    [
        `${channel}-mac.yml`,
        [releaseFile('macOS-x64.zip'), releaseFile('macOS-arm64.zip'), releaseFile('macOS-universal.zip')],
    ],
    [`${channel}-linux.yml`, [releaseFile('Linux-x86_64.AppImage')]],
    [`${channel}-linux-arm64.yml`, [releaseFile('Linux-arm64.AppImage')]],
]);

for (const [manifest, requiredAssets] of expectedManifestAssets) {
    const references = manifestAssets.get(manifest);
    for (const requiredAsset of requiredAssets) {
        if (!references?.has(requiredAsset)) {
            throw new Error(`${manifest} does not reference required updater asset: ${requiredAsset}`);
        }
    }
}

const requiredTargets = [
    ['Windows x64 NSIS installer', releaseFile('Windows-x64-Setup.exe')],
    ['macOS x64 DMG', releaseFile('macOS-x64.dmg')],
    ['macOS x64 PKG', releaseFile('macOS-x64.pkg')],
    ['macOS x64 updater ZIP', releaseFile('macOS-x64.zip')],
    ['macOS arm64 DMG', releaseFile('macOS-arm64.dmg')],
    ['macOS arm64 PKG', releaseFile('macOS-arm64.pkg')],
    ['macOS arm64 updater ZIP', releaseFile('macOS-arm64.zip')],
    ['macOS universal DMG', releaseFile('macOS-universal.dmg')],
    ['macOS universal PKG', releaseFile('macOS-universal.pkg')],
    ['macOS universal updater ZIP', releaseFile('macOS-universal.zip')],
    ['Linux x64 AppImage', releaseFile('Linux-x86_64.AppImage')],
    ['Linux x64 DEB', releaseFile('Linux-amd64.deb')],
    ['Linux x64 RPM', releaseFile('Linux-x86_64.rpm')],
    ['Linux arm64 AppImage', releaseFile('Linux-arm64.AppImage')],
    ['Linux arm64 DEB', releaseFile('Linux-arm64.deb')],
    ['Linux arm64 RPM', releaseFile('Linux-aarch64.rpm')],
];

for (const [description, fileName] of requiredTargets) {
    if (!names.has(fileName)) {
        throw new Error(`Missing required release target: ${description}`);
    }
}

selected.sort((left, right) => left.fileName.localeCompare(right.fileName, 'en'));
for (const { fileName, sourceFile } of selected) {
    await copyFile(sourceFile, path.join(outputDirectory, fileName));
}

const checksumLines = [];
for (const { fileName } of selected) {
    const digest = await sha256(path.join(outputDirectory, fileName));
    checksumLines.push(`${digest}  ${fileName}`);
}

await writeFile(path.join(outputDirectory, 'SHA256SUMS.txt'), `${checksumLines.join('\n')}\n`, 'utf8');
console.log(`Prepared ${selected.length} release assets plus SHA256SUMS.txt:`);
for (const { fileName } of selected) {
    console.log(`- ${fileName}`);
}
