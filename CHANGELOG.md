# Changelog

This file records notable changes for users and operators. Pull requests add short entries under `Unreleased`. A release pull request moves them into a dated version section ([how](docs/RELEASING.md#pull-requests-and-patch-notes))

## [Unreleased]

### Added

- Added pull request CI that runs `pnpm check` and the Electron E2E spec on Linux
- Added a Renovate configuration with grouped weekly updates, a three-day release age, and approval before major upgrades
- Added a `system.getRuntimeInfo` procedure that reports the app, Electron, Chromium, Node.js, and V8 versions
- Added a redesigned start page with a live runtime readout and a bridge playground. The bridge playground sends real tRPC calls, uses TanStack Form, TanStack Virtual, Zustand, Mutative, and a shared ArkType schema, and is isolated so it can be deleted on its own
- Added a deny-by-default web permission policy and a single-instance lock

### Changed

- CI and release workflows set up Node.js and pnpm with `pnpm/setup`, which reads `.node-version` and `packageManager` and replaces `actions/setup-node`. The previous `pnpm/action-setup` pin pointed to a commit that does not exist, so workflows failed at startup
- Upgraded to Electron 44, Node.js 24.21.0, pnpm 12.6.0, Vitest 5, React 19.3, Vite 8.3, and current tRPC and TanStack releases
- Replaced `electron-trpc-experimental` with a repository-owned IPC bridge built on tRPC's public `httpBatchLink` and `fetchRequestHandler`. tRPC upgrades no longer depend on internal tRPC modules. Subscriptions are not supported
- Moved the React integration to `@trpc/tanstack-react-query` and merged the two renderer clients into `src/lib/trpc.ts`
- The packaged renderer now loads from the privileged `app://bundle` scheme, and the `grantFileProtocolExtraPrivileges` fuse is disabled
- tRPC inputs are now validated with ArkType instead of hand-written checks
- The E2E spec now covers the `app://` origin, the tRPC bridge, the served CSP, path traversal, and denied permissions. It also ignores an inherited `ELECTRON_RUN_AS_NODE`

### Removed

- Removed `.nvmrc`. `.node-version` is now the only Node.js version file
- Removed the Linux armv7l target because Electron 44 no longer publishes armv7l binaries. Releases now contain 16 primary files and four channel manifests

## [0.1.0] - 2026-07-11

### Added

- Added stable and opt-in beta update channels backed by GitHub Releases
- Added native Windows, macOS, and Linux packaging with update metadata for every supported target
- Added a manually approved, cross-platform GitHub Actions release workflow with strict SemVer tags, checksums, curated notes, and a single publication step
- Added guidance on releases, merges, patch notes, signing, beta promotion, hotfixes, and rollback for apps created from this template
- Added a researched guide to optional libraries: Local SQLite/Drizzle data, Convex, desktop authentication, observability, E2E testing, secrets, and native modules
- Added an inert Node `node:sqlite` + Drizzle scaffold with hardened connection defaults, migration tooling, packaged migration resources, and behavior tests. Startup creates no database or product tables
- Added a Playwright Electron E2E scaffold. It builds the production renderer, isolates its user data, disables updates, checks the redesigned UI and window security preferences, and runs on every native-OS release job
- Added DMG, PKG, and ZIP output for macOS x64, arm64, and universal, plus AppImage, DEB, and RPM output for Linux x64, arm64, and armv7l. This came with architecture-aware update manifests, structural checks, and release inventory enforcement

### Changed

- Refreshed the dependencies and standardized development and CI on Node.js 24.18.0 LTS and a pinned pnpm 11
- Made package, runtime, installer, and update-channel configuration explicit and reproducible for template users
- Redesigned the start page as a scannable desktop project overview. Removed generic status and slogan pills and animated decoration, restored a consistent outline-icon system, fixed cramped shared-border grids, and separated setup, releases, the installed toolkit, and optional recommendations
- Hardened packaged binaries with Electron fuses for cookie encryption, ASAR integrity, and constrained code loading. Disabled the production Node option, inspector, and `ELECTRON_RUN_AS_NODE` injection paths
- Restricted production navigation to the exact packaged app entry, denied production `devtools://` bypasses, and removed unused remote-font origins from the CSP
- Expanded ESLint to the recommended policies for every installed TypeScript, React, accessibility, security, TanStack, Vitest, and Playwright ecosystem. Configured Prettier's Tailwind v4 class sorting to read the stylesheet
- Trimmed tests that only repeated package versions, source strings, or implementation order. Kept executable release, security, persistence, database, and Electron-window behavior checks
- Made artifact filenames URL-safe. Added a release guard that rejects updater manifests whose referenced assets are missing, so GitHub upload names cannot diverge from update metadata

### Removed

- Removed the application-specific generic publish script in favor of auditable GitHub release automation

[Unreleased]: https://github.com/example-owner/example-electron-app/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/example-owner/example-electron-app/releases/tag/v0.1.0
