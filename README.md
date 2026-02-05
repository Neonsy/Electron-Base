# Electron + Vite + React template

A security-focused starting point for desktop apps built with Electron 44, React 19, Vite 8, TypeScript 6, TanStack Router and Query, and Tailwind CSS 4. The renderer calls the main process through typed tRPC procedures over sandboxed IPC. The template also ships cross-platform installers, stable and beta update channels, pull request checks, automated dependency updates, and opt-in local database and E2E scaffolds

## Prerequisites

- [Node.js 24.21.0 LTS](https://nodejs.org/en/blog/release/v24.21.0)
- pnpm 12.6.0
- Platform build tools, only when you package installers locally

```sh
npm install --global pnpm@12.6.0
pnpm --version
```

The last command must print `12.6.0`. [Development workflow](docs/development.md) explains how these versions are pinned

## Get started

```sh
pnpm install
pnpm dev
```

`pnpm dev` starts Vite and Electron together. Electron downloads its binary the first time it runs, not during `pnpm install`, so the first `pnpm dev` or `pnpm test:e2e` on a new machine needs network access

The start page is a live tour of the template. Its bridge playground sends real tRPC calls to the main process. Remove it when you build your product (see [Make it yours](#make-it-yours))

Before you push, run `pnpm check`. It runs the full local validation suite

## Scripts

| Command             | Purpose                                                                              |
| ------------------- | ------------------------------------------------------------------------------------ |
| `pnpm dev`          | Start Vite and Electron in development mode                                          |
| `pnpm build`        | Generate routes and build the renderer, main-process, and preload bundles            |
| `pnpm build:win`    | Build the app and a Windows x64 NSIS installer                                       |
| `pnpm build:mac`    | Build macOS DMG, PKG, and ZIP outputs for x64, arm64, and universal                  |
| `pnpm build:linux`  | Build Linux AppImage, DEB, and RPM outputs for x64 and arm64                         |
| `pnpm typecheck`    | Generate routes and type-check the renderer and Node/Electron projects               |
| `pnpm lint`         | Generate routes and run the type-aware ESLint configuration                          |
| `pnpm lint:fix`     | Apply safe ESLint fixes                                                              |
| `pnpm format`       | Format the workspace with Prettier                                                   |
| `pnpm format:check` | Check formatting without changing files                                              |
| `pnpm test`         | Run the Vitest suite once                                                            |
| `pnpm test:watch`   | Run Vitest in watch mode                                                             |
| `pnpm test:e2e`     | Build and launch the Playwright Electron E2E spec                                    |
| `pnpm db:generate`  | Generate committed SQLite migrations from the product schema                         |
| `pnpm db:check`     | Check the Drizzle migration history for consistency                                  |
| `pnpm check`        | Run typecheck, lint, format check, tests, migration check, and the production bundle |

There is no publish script on purpose. Releases go through the workflow in `.github/workflows/release.yml` (see [Releasing](docs/RELEASING.md))

## How it works

```text
React renderer (app://bundle, sandboxed)        src/
  -> tRPC httpBatchLink with a bridge fetch      src/lib/
  -> preload exposes only trpcBridge.request()   electron/main/preload/
  -> ipcMain.handle('trpc:request')              electron/main/ipc/
  -> tRPC routers in the main process            electron/backend/trpc/
```

Renderer code never imports Electron or Node APIs. When the renderer needs a privileged action, add a narrow tRPC procedure in the main process. [Architecture](docs/architecture.md) explains each step and the security baseline

## Make it yours

Before you build a real product:

1. Replace the example repository URL, app ID, product name, author, homepage, bugs URL, icons, and UI copy
2. Replace the start page. Delete `src/features/bridge-playground/`, `src/components/home/`, `electron/backend/trpc/routers/examples/` with its mount in `electron/backend/trpc/router.ts`, and `electron/shared/examples/`
3. Remove runtime dependencies the product will not use. Without the bridge playground, TanStack Form, TanStack Virtual, Zustand, and Mutative have no remaining users, and the Geist fonts belong to the start page
4. Extend the CSP only for origins the product explicitly needs
5. Before you enable the inert database scaffold, define persistence ownership, life cycle, migrations, deletion, and recovery (see [Optional libraries](docs/optional-libraries.md#local-data))
6. Configure Windows signing and macOS signing and notarization (see [Signing](docs/RELEASING.md#signing))
7. Protect the release environment and default branch, require the CI check, enable immutable releases, create release-note labels, and install the Renovate GitHub app (see [Before the first release](docs/RELEASING.md#before-the-first-release))
8. Install an older signed build on each supported OS and architecture. Test stable updates, beta opt-in, beta-to-stable promotion, interrupted downloads, and fix-forward recovery

## Documentation

| Guide                                            | Read it when you want to                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| [Architecture](docs/architecture.md)             | Understand the IPC bridge, add a procedure, open external links, or review security  |
| [Development workflow](docs/development.md)      | Run checks and tests, understand CI, Renovate, pnpm policy, or environment overrides |
| [Update channels](docs/updates.md)               | Configure the stable and beta channels and the GitHub update provider                |
| [Releasing](docs/RELEASING.md)                   | Prepare, run, sign, promote, or recover a release and review package formats         |
| [Optional libraries](docs/optional-libraries.md) | Choose a database, backend, auth, telemetry, or test library for a product need      |
| [Changelog](CHANGELOG.md)                        | See what changed between versions                                                    |

## License

[MIT](LICENSE)
