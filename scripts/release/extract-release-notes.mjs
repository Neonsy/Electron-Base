import { readFile, writeFile } from 'node:fs/promises';

function requiredEnvironment(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

const version = requiredEnvironment('RELEASE_VERSION');
const outputFile = requiredEnvironment('RELEASE_NOTES_FILE');
const changelog = await readFile('CHANGELOG.md', 'utf8');
const lines = changelog.split(/\r?\n/u);
const releaseHeading = new RegExp(`^## \\[${escapeRegExp(version)}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'u');
const matchingHeadings = lines.flatMap((line, index) => (releaseHeading.test(line) ? [index] : []));

if (matchingHeadings.length !== 1) {
    throw new Error(
        `CHANGELOG.md must contain exactly one dated release-notes section for ${version}; found ${matchingHeadings.length}.`
    );
}

const [start] = matchingHeadings;

let end = lines.findIndex((line, index) => index > start && (line.startsWith('## [') || /^\[[^\]]+\]:\s/u.test(line)));
if (end === -1) {
    end = lines.length;
}

const notes = `${lines.slice(start, end).join('\n').trim()}\n`;
await writeFile(outputFile, notes, 'utf8');
console.log(`Wrote curated release notes for ${version} to ${outputFile}.`);
