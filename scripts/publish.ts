#!/usr/bin/env -S node --enable-source-maps
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

interface RunOptions {
    allowFail?: boolean;
    captureStdout?: boolean;
}

function required(value: string | undefined | null, envName: string): string {
    const v = (value ?? '').trim();
    if (v === '') {
        console.error(`❌ Missing required env: ${envName}. Set it in .env or your environment.`);
        process.exit(1);
    }
    return v;
}

function validatePort(value: string, envName: string): string {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
        console.error(`❌ Invalid ${envName}: ${value}. Must be an integer between 1 and 65535.`);
        process.exit(1);
    }
    return String(n);
}

function validateSshDestination(value: string): string {
    if (!/^[A-Za-z0-9._-]+@[A-Za-z0-9._:-]+$/u.test(value)) {
        console.error(
            `❌ Invalid UPDATER_SSH: ${value}. Expected user@host and only alphanumeric, dot, dash, underscore, colon characters.`
        );
        process.exit(1);
    }

    return value;
}

function parseCliOptionString(value: string, envName: string): string[] {
    const tokens = value
        .split(/\s+/u)
        .map((token) => token.trim())
        .filter(Boolean);

    if (tokens.length === 0) {
        console.error(`❌ ${envName} must include at least one ssh option token.`);
        process.exit(1);
    }

    for (const token of tokens) {
        if (!/^[A-Za-z0-9._:@%+,/=-]+$/u.test(token)) {
            console.error(`❌ Invalid token in ${envName}: "${token}". Use plain ssh option tokens only.`);
            process.exit(1);
        }
    }

    return tokens;
}

function shellQuote(value: string): string {
    return `'${value.replace(/'/gu, `'"'"'`)}'`;
}

function formatCommand(command: string, args: string[]): string {
    const printable = args.map((arg) => (/[\s"]/u.test(arg) ? JSON.stringify(arg) : arg));
    return [command, ...printable].join(' ');
}

function run(command: string, args: string[], opts: RunOptions = {}): string {
    const { allowFail = false, captureStdout = false } = opts;

    console.log(`$ ${formatCommand(command, args)}`);

    const result = spawnSync(command, args, {
        encoding: 'utf8',
        stdio: captureStdout ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    });

    if (result.error) {
        if (allowFail) {
            return result.stdout;
        }
        throw result.error;
    }

    if (result.status !== 0) {
        if (allowFail) {
            return result.stdout;
        }
        throw new Error(`${command} failed with exit code ${String(result.status)}`);
    }

    return result.stdout;
}

const SSH_DEST = validateSshDestination(required(process.env.UPDATER_SSH, 'UPDATER_SSH'));
const envPort = process.env.UPDATER_SSH_PORT?.trim();
const SSH_PORT = validatePort(envPort && envPort !== '' ? envPort : '22', 'UPDATER_SSH_PORT');
const SSH_KEY = required(process.env.UPDATER_SSH_KEY, 'UPDATER_SSH_KEY');
const SSH_OPTS = parseCliOptionString(required(process.env.UPDATER_SSH_OPTS, 'UPDATER_SSH_OPTS'), 'UPDATER_SSH_OPTS');
const CONTAINER = required(process.env.UPDATER_CONTAINER, 'UPDATER_CONTAINER');
const CONTAINER_PATH = required(process.env.UPDATER_PATH, 'UPDATER_PATH');

if (!existsSync(SSH_KEY)) {
    console.error(`❌ UPDATER_SSH_KEY file not found: ${SSH_KEY}`);
    process.exit(1);
}

const pkg = JSON.parse(await readFile('package.json', 'utf8')) as {
    version?: string;
};
const version = pkg.version ?? '';
if (!version) {
    console.error('❌ No version found in package.json');
    process.exit(1);
}

const baseVersion = version.split('+')[0] ?? version;
const prerelease = baseVersion.includes('-') ? (baseVersion.split('-')[1] ?? '') : '';
const channel = prerelease ? (prerelease.split('.')[0] ?? '') : '';

const releaseDir = join('release', baseVersion);
if (!existsSync(releaseDir)) {
    console.error(`❌ Release directory not found: ${releaseDir}. Run "pnpm build" first.`);
    process.exit(1);
}

let latestYml = join(releaseDir, channel ? `${channel}.yml` : 'latest.yml');
if (!existsSync(latestYml)) {
    if (channel && existsSync(join(releaseDir, `latest-${channel}.yml`))) {
        latestYml = join(releaseDir, `latest-${channel}.yml`);
    } else if (existsSync(join(releaseDir, 'latest.yml'))) {
        latestYml = join(releaseDir, 'latest.yml');
    } else {
        const anyYml = (await readdir(releaseDir)).find((file) => file.endsWith('.yml'));
        if (!anyYml) {
            console.error(`❌ No updater manifest (*.yml) found in ${releaseDir}. Build may have failed.`);
            process.exit(1);
        }
        latestYml = join(releaseDir, anyYml);
    }
}

const files = await readdir(releaseDir);
const exe = files.find((file) => file.toLowerCase().endsWith('-setup.exe'));
if (!exe) {
    console.error(`❌ No Windows installer (*-Setup.exe) found in ${releaseDir}`);
    process.exit(1);
}
const exePath = join(releaseDir, exe);
const ymlName = basename(latestYml);
const exeName = basename(exePath);

const isWindows = process.platform === 'win32';
const useMux = !isWindows && (process.env.UPDATER_SSH_MUX ?? '1') !== '0';

const ctrlDir = useMux ? join(homedir(), '.ssh', 'controlmasters') : '';
if (useMux) {
    await mkdir(ctrlDir, { recursive: true });
}
const ctrlPath = useMux ? join(ctrlDir, '%C') : '';

const sshAuthArgs = ['-p', SSH_PORT, '-i', SSH_KEY, ...SSH_OPTS, '-o', 'PreferredAuthentications=publickey'];
const scpAuthArgs = ['-P', SSH_PORT, '-i', SSH_KEY, ...SSH_OPTS, '-o', 'PreferredAuthentications=publickey'];
const sshMuxArgs = useMux
    ? ['-o', `ControlPath=${ctrlPath}`, '-o', 'ControlMaster=auto', '-o', 'ControlPersist=yes']
    : [];
const sshReuseArgs = useMux ? ['-o', `ControlPath=${ctrlPath}`] : [];

const tmpDir = `/tmp/wash-app-publish-${String(Date.now())}`;
const remoteLog = `${tmpDir}/publish.log`;

const qTmpDir = shellQuote(tmpDir);
const qRemoteLog = shellQuote(remoteLog);
const qRemoteYmlPath = shellQuote(`${tmpDir}/${ymlName}`);
const qRemoteExePath = shellQuote(`${tmpDir}/${exeName}`);
const qContainer = shellQuote(CONTAINER);
const qContainerTargetDir = shellQuote(`${CONTAINER}:${CONTAINER_PATH}/`);
const qContainerPathForWildcard = shellQuote(`rm -f "${CONTAINER_PATH}"/*.exe || true`);

function runSsh(remoteCommand: string, opts: RunOptions = {}): string {
    return run('ssh', [...sshReuseArgs, ...sshAuthArgs, SSH_DEST, remoteCommand], opts);
}

function openMaster(): void {
    if (!useMux) {
        return;
    }

    run('ssh', [...sshMuxArgs, ...sshAuthArgs, '-M', '-N', '-f', SSH_DEST]);
}

function closeMaster(): void {
    if (!useMux) {
        return;
    }

    run('ssh', ['-S', ctrlPath, '-O', 'exit', ...sshAuthArgs, SSH_DEST], {
        allowFail: true,
    });
}

process.on('exit', closeMaster);
process.on('SIGINT', () => {
    closeMaster();
    process.exit(130);
});
process.on('SIGTERM', () => {
    closeMaster();
    process.exit(143);
});

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║         Resource Calendar - App Publish Script                ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`📌 Host:        ${SSH_DEST}`);
console.log(`📌 Port:        ${SSH_PORT}`);
console.log(`📌 Container:   ${CONTAINER}`);
console.log(`📌 Path:        ${CONTAINER_PATH}`);
console.log(`📌 Version:     ${version}`);
console.log(`📌 Installer:   ${exeName}`);
console.log(`📌 Manifest:    ${ymlName}`);
console.log('');

try {
    openMaster();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[STEP 1/3] 📁 Preparing remote tmp directory...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const prepareTmpCmd = [
        `mkdir -p ${qTmpDir}`,
        `chmod 700 ${qTmpDir}`,
        `: > ${qRemoteLog}`,
        `echo $(date -Is) INFO Created tmp dir >> ${qRemoteLog}`,
    ].join(' && ');
    runSsh(prepareTmpCmd);
    console.log('✅ Remote tmp directory ready.\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[STEP 2/3] 📤 Uploading artifacts to remote server...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    run('scp', [...sshReuseArgs, ...scpAuthArgs, latestYml, exePath, `${SSH_DEST}:${tmpDir}/`]);
    console.log('✅ Artifacts uploaded.\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[STEP 3/3] 🐳 Publishing into container and cleaning up...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const step3Cmd = [
        'set -e',
        `echo $(date -Is) INFO Uploads present: >> ${qRemoteLog}`,
        `ls -lh ${qTmpDir} >> ${qRemoteLog}`,
        `sudo -n docker cp ${qRemoteYmlPath} ${qContainerTargetDir} && echo $(date -Is) INFO docker cp ${ymlName} ok >> ${qRemoteLog}`,
        `sudo -n docker exec ${qContainer} sh -lc ${qContainerPathForWildcard} && echo $(date -Is) INFO removed old installers >> ${qRemoteLog}`,
        `sudo -n docker cp ${qRemoteExePath} ${qContainerTargetDir} && echo $(date -Is) INFO docker cp ${exeName} ok >> ${qRemoteLog}`,
        `echo $(date -Is) INFO Full log follows: >> ${qRemoteLog}`,
        `cat ${qRemoteLog}`,
        `rm -rf ${qTmpDir} || true`,
        'echo $(date -Is) INFO Cleaned up tmp dir',
    ].join('; ');

    const step3Out = runSsh(step3Cmd, { captureStdout: true });
    writeFileSync('publish-last.log', step3Out, 'utf8');
    console.log('✅ Published into container.\n');

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                     ✅ PUBLISH SUCCESSFUL                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`Version "${version}" has been published to the update server.`);
    console.log('');
} catch (error) {
    console.error('');
    console.error('╔═══════════════════════════════════════════════════════════════╗');
    console.error('║                     ❌ PUBLISH FAILED                         ║');
    console.error('╚═══════════════════════════════════════════════════════════════╝');
    console.error('');
    if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
    }

    try {
        console.log('[INFO] 📋 Attempting to print remote log tail:');
        runSsh(`test -f ${qRemoteLog} && tail -n 200 ${qRemoteLog} || true`, {
            allowFail: true,
        });
    } catch {}

    process.exit(1);
} finally {
    closeMaster();
}
