# Update channels

Read this before you point the updater at a real repository, mount the channel control, or change how channels behave

## Supported channels

Users choose between two channels. Each maps to an `electron-updater` provider channel and a GitHub release type:

| User choice | Provider channel | Tag example     | GitHub release type | Receives                   |
| ----------- | ---------------- | --------------- | ------------------- | -------------------------- |
| Stable      | `latest`         | `v1.4.0`        | Full release        | Stable releases only       |
| Beta        | `beta`           | `v1.5.0-beta.1` | Prerelease          | Beta releases, then stable |

- `canary` is not an alias for beta
- The unused `alpha` tier and custom channel strings are excluded. This keeps one predictable prerelease cohort and keeps the documented beta-to-stable promotion behavior

## Three systems not to confuse

1. Electron's built-in `autoUpdater` has no named channels. It accepts a feed, supports macOS and Windows, and has no canary, beta, or stable enum
2. `electron-updater`, which this template uses, adds Linux, GitHub provider integration, generated metadata, download progress, signing checks, and ordered `latest`, `beta`, and `alpha` channel semantics. The channel semantics in this template come from here
3. GitHub Releases has draft, prerelease, and full-release states. GitHub does not label a release as canary, beta, or alpha

## Channel control and stored choice

An accessible Stable/Beta control is ready in `src/components/updates/update-channel-control.tsx`. It is not mounted on the start page while the provider still points at an example repository. Mount it in product settings after you configure a real update feed

The main process validates the choice and stores it atomically in `update-channel.json` below Electron's per-user `userData` directory. A stored choice always wins. Without one, beta builds default to Beta and stable builds default to Stable

## Switching back to stable

Switching to Stable never downgrades the installed app. If the installed beta is newer than the latest stable release, the app stays on it until a higher stable version exists. This protects local databases, settings, and other data that went through forward-only migrations

## Testing updates

Updater checks are disabled in unpackaged development by default. `UPDATER_ENABLED=1` enables the code path for UI testing, but it also needs a valid `dev-app-update.yml`. Test real update behavior with a signed packaged app

## GitHub update provider

`package.json` contains this example repository on purpose:

```text
https://github.com/example-owner/example-electron-app
```

Replace the owner and repository before you release. `electron-builder.config.ts` reads that URL as the source of truth for the GitHub provider, and the release preflight enforces it (see [Before the first release](RELEASING.md#before-the-first-release))

The update repository must be public. Never embed a GitHub token in a desktop binary. A private GitHub update repository would need credentials on end-user machines, so it is not a safe default for general distribution

## Channel in builds

GitHub publishing does not infer the update channel from a prerelease version. The builder therefore requires an explicit `UPDATE_CHANNEL` and checks it against `version` in `package.json`:

- `1.4.0` must build with `UPDATE_CHANNEL=latest`
- `1.5.0-beta.1` must build with `UPDATE_CHANNEL=beta`

Normal local builds infer the same channel from the package version. Alpha, canary, RC, build-metadata, and malformed versions fail before packaging
