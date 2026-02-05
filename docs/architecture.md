# Architecture

Read this when you add privileged behavior, change how the renderer talks to the main process, or review the security baseline

## Where code lives

| Path                         | Contents                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/`                       | Browser-only React renderer code                                                                    |
| `electron/main/`             | Privileged Electron life cycle, windows, the `app://` protocol, IPC, security, logging, and updates |
| `electron/backend/trpc/`     | The typed API that renderer windows call over IPC                                                   |
| `electron/main/preload/`     | The minimal sandbox-compatible bridge                                                               |
| `electron/shared/`           | Dependency-free contracts imported by the main process, the preload, and the renderer               |
| `vite.config.ts`             | Renderer, main-process, and preload bundling                                                        |
| `electron-builder.config.ts` | Installers, updater provider, architectures, and artifact names                                     |

Import aliases make the runtime boundary visible:

- `@/web/*` resolves to `src/*`
- `@/app/*` resolves to `electron/*`

Do not import Electron or Node APIs into renderer modules. Add privileged behavior behind a narrow tRPC procedure

## Request path

```text
React renderer (app://bundle, sandboxed)
  └─ tRPC httpBatchLink with a bridge fetch           src/lib/
       └─ sandboxed CommonJS preload                  electron/main/preload/
          exposes only trpcBridge.request()
            └─ ipcMain.handle('trpc:request')         electron/main/ipc/
                 ├─ rejects frames outside the app origin
                 ├─ validates the serialized request with ArkType
                 └─ tRPC fetchRequestHandler           electron/backend/trpc/
                      ├─ application routers
                      ├─ window/security policy
                      ├─ structured logging
                      └─ update controller
```

## How the IPC bridge works

The repository owns a small bridge built only on tRPC's public adapters:

1. The renderer uses tRPC's standard `httpBatchLink` with a custom `fetch`. The `fetch` serializes each request and passes it to the preload's single `trpcBridge.request()` function
2. The main process accepts the request only from a top-level frame on the app origin and validates its shape with ArkType
3. The main process rebuilds it as a web `Request` and runs it through tRPC's official `fetchRequestHandler`

Calls made in the same tick share one IPC message, so a burst of 100 calls crosses the boundary once

The community electron-trpc packages import tRPC internals and have not kept pace with tRPC releases, which is how a tRPC upgrade can break them. This bridge upgrades with tRPC like any other fetch-based adapter. Its behavior tests in `src/lib/trpcBridgeFetch.test.ts` run a real client against a real router with only the IPC hop replaced

Subscriptions are not supported because the bridge returns complete responses. When a product needs push events, add a dedicated channel or a streaming transport instead of widening the preload API

## Adding an IPC procedure

1. Put domain behavior in a focused module under `electron/backend/trpc/routers/` or in a main-process service
2. Register a query or mutation in the appropriate router
3. Validate every renderer-controlled input at the router boundary. tRPC accepts ArkType types directly, for example `.input(type({ '+': 'reject', name: 'string' }))`
4. In components, call `const trpc = useTRPC()` and pass `trpc.system.getRuntimeInfo.queryOptions()` or a procedure's `.mutationOptions()` to TanStack Query's `useQuery` or `useMutation`. Outside React, use `trpcClient` from `src/lib/trpc.ts`
5. Add a behavior test when the procedure protects a meaningful failure, security, or persistence path

The renderer never receives raw `ipcRenderer`, filesystem access, arbitrary update feeds, or other broad capabilities

## The app:// protocol

Packaged builds serve the renderer from the privileged `app://bundle` origin instead of `file://`. The protocol handler serves only files inside the renderer build, rejects path traversal and non-GET requests, and attaches the CSP to every response

The renderer keeps hash routing, so every route loads the same `index.html` and the protocol handler needs no history fallback

## External links

Use a normal link when renderer content should open documentation or another public URL in the system browser:

```tsx
<a href='https://example.com' target='_blank' rel='noreferrer'>
    Open documentation
</a>
```

The main-process navigation guard handles the link:

- It denies the new Electron window
- It accepts only well-formed `http:`, `https:`, and `mailto:` URLs and passes them to `shell.openExternal()`
- It also intercepts attempted in-window external navigation
- In production, the window may navigate only within `app://bundle`

Do not expose Electron `shell` or an unrestricted URL-opening IPC procedure to renderer code. If a product needs another scheme, extend the central protocol and origin policy

## Security baseline

- Renderer context isolation and Chromium sandboxing are enabled
- Node integration is disabled in the renderer
- The packaged renderer loads from `app://bundle` (see [The app:// protocol](#the-app-protocol))
- The preload is a single CommonJS sandbox bundle that exposes only `trpcBridge.request()`
- The IPC handler answers only top-level frames on the app origin and validates every serialized request
- Navigation and `window.open` requests are allowlisted, and external links open in the OS browser
- Every web permission request is denied except writing sanitized text to the clipboard. Electron grants all of them by default, so add one to `electron/main/security/sessionPolicy.ts` only when a feature needs it
- A single-instance lock focuses the running app instead of letting a second process race it for `userData` files
- A centralized production CSP blocks inline scripts, plugins, framing, and arbitrary connections
- Production devtools are disabled
- Package-time Electron fuses disable `ELECTRON_RUN_AS_NODE`, Node option and inspector injection, and the legacy `file://` privileges. They also encrypt Chromium cookies and require the integrity-checked ASAR on Windows and macOS
- Structured logs are stored below Electron `userData`, batched, retried, and flushed on shutdown. evlog 2 redacts production events before drains by default
- The renderer cannot set the update feed to an arbitrary URL or channel

These defaults reduce risk. They do not replace a product-specific threat model, dependency review, code signing, secure secret handling, or testing on every supported operating system

The E2E spec exercises the `app://` protocol with the unpackaged Electron binary, and the release workflow runs it on Windows, macOS, and Linux before building. Fuses are written only at packaging time. Before the first release, also launch a packaged build on each platform to confirm that the `grantFileProtocolExtraPrivileges` fuse is disabled

## Project structure

```text
.
├── .github/
│   ├── release.yml                 # Generated release-note categories
│   └── workflows/
│       ├── ci.yml                  # Pull request checks and E2E
│       └── release.yml             # Manual native-runner release workflow
├── docs/                           # Architecture, development, updates, releasing, optional libraries
├── electron/
│   ├── backend/trpc/               # Typed IPC routers and context
│   ├── main/
│   │   ├── bootstrap/              # Electron lifecycle orchestration
│   │   ├── data/                   # Inert node:sqlite + Drizzle scaffold
│   │   ├── ipc/                    # tRPC bridge handler
│   │   ├── logging/                # evlog setup and NDJSON drain
│   │   ├── preload/                # Sandboxed preload build and entry
│   │   ├── protocol/               # app:// scheme and asset resolution
│   │   ├── security/               # CSP, URL, and permission policy
│   │   ├── updates/                # Updater and persisted channel policy
│   │   └── window/                 # BrowserWindow factory and guards
│   └── shared/                     # Contracts shared by main, preload, and renderer
├── e2e/                            # Explicit Playwright Electron test
├── scripts/release/                # Dependency-free release validation helpers
├── src/
│   ├── components/                 # Start page sections and renderer UI
│   ├── features/bridge-playground/ # Start-page demo of the IPC bridge
│   ├── lib/                        # Providers, tRPC client, and bridge fetch
│   ├── pages/                      # Page implementations
│   ├── routes/                     # TanStack file routes
│   └── styles/                     # Tailwind theme and global styles
├── CHANGELOG.md
├── drizzle.config.ts
├── electron-builder.config.ts
├── package.json
├── playwright.config.ts
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── renovate.json
└── vite.config.ts
```
