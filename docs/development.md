# Development workflow

Read this when you set up the toolchain, run checks and tests, review dependency updates, or change CI

## Toolchain pins

- Node.js is pinned to `24.21.0` LTS, the Node.js line that Electron 44 embeds
- pnpm is pinned to `12.6.0`. The `packageManager` field in `package.json` also carries an integrity hash
- `packageManager`, `engines`, `.node-version`, the workspace policy, and the release workflow all enforce the same baseline
- A standalone pnpm installation is the normal local workflow. Corepack stays optional for developers who prefer it
- CI and release jobs use [`pnpm/setup`](https://github.com/pnpm/setup), pinned to a commit. It installs the pnpm version from `packageManager` and the Node.js version from `.node-version`, verifies the downloaded pnpm binary, and caches the pnpm store. Jobs that need dependencies install them from the frozen lockfile

The exact `12.6.0` pin is deliberate. It was verified with a clean install and a frozen reinstall of this dependency graph. Treat a future pnpm bump as a tested toolchain change, not an automatic version edit. Renovate is configured to leave it alone

## Checks and tests

`pnpm check` runs type checking, lint, the format check, the Vitest suite, the Drizzle migration history check, Playwright spec discovery, and the production bundle. It does not launch a GUI

Run `pnpm test:e2e` explicitly on a desktop test host. It:

1. Builds the production bundles
2. Launches the unflipped development Electron binary with an isolated user-data directory and updates disabled
3. Checks the `app://` origin, the tRPC bridge, bridge playground validation, the served CSP, path-traversal refusal, denied web permissions, and hardened window preferences
4. Closes the app in cleanup

The E2E run clears `ELECTRON_RUN_AS_NODE`. Terminals inside Electron-based editors export it, and it would otherwise start Electron as plain Node.js

The E2E window never takes focus or covers your screen. The spec shows it without activating it, places it past the right edge of every display, and skips maximizing. Two Chromium switches keep the off-screen window rendering normally

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`. It installs from the frozen lockfile, runs `pnpm check`, and then runs the Electron E2E spec under Xvfb on Linux. Make it a required status check for the default branch

The release workflow runs its own checks. See [Running the release](RELEASING.md#running-the-release)

## Dependency updates

`renovate.json` configures the [Renovate GitHub app](https://github.com/apps/renovate). After you install the app on the repository, Renovate:

- Opens one grouped pull request for routine updates each Monday
- Keeps Electron and Drizzle updates in their own pull requests
- Waits three days after a release before proposing it
- Asks for approval on the dependency dashboard before any major upgrade
- Skips Node.js and pnpm, because they are pinned in several files and are tested toolchain changes
- Skips `@types/node` majors, because they must follow the Node.js line that Electron embeds

## pnpm policy

`pnpm-workspace.yaml` holds the pnpm 12 policy:

- `allowBuilds` explicitly permits the reviewed install scripts of `electron-winstaller`, `esbuild`, and `unrs-resolver`. Electron 44 no longer has an install script, so it is intentionally absent
- `nodeVersion` and `engineStrict` prevent resolving dependencies that are incompatible with Node 24.21.0
- A 24-hour minimum release age quarantines brand-new releases. The non-strict fallback stays on for packages that have no older satisfying version. pnpm 12 also verifies the lockfile against this policy on every install
- Exotic transitive sources and unreviewed dependency build scripts keep pnpm's secure defaults

When pnpm reports a new dependency build script, inspect the package and version, then add a precise `true` or `false` entry to `allowBuilds`. Never enable every dependency script globally

When you request a version published within the last 24 hours, pnpm 12 may add a `minimumReleaseAgeExclude` entry for it to `pnpm-workspace.yaml`. Do not commit those entries. Request an older version or wait a day instead

The committed lockfile is the reproducible dependency source. CI uses `pnpm install --frozen-lockfile`. Update the lockfile only through the pinned pnpm release

## Lint and format

ESLint composes the recommended type-aware TypeScript, React, React Hooks Compiler, JSX accessibility, import, Node, security, TanStack Query, Vitest, and Playwright policies. Narrow exceptions are documented beside reviewed runtime boundaries

Prettier is the single formatting authority. Its Tailwind plugin points at the Tailwind CSS v4 stylesheet, so project theme utilities take part in deterministic class sorting

## Environment overrides

Copy `.env.example` to `.env` only for local overrides. Do not put credentials in Vite-prefixed variables or commit secrets. Signing and GitHub publication credentials belong in protected CI secrets and environments, not in application environment files
