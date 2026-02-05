# Optional libraries

Read this when a product need calls for a database, hosted backend, authentication, telemetry, a different test stack, or a native dependency

## What the template includes

The template installs only two inert extras: A Node SQLite + Drizzle scaffold and a single Playwright Electron spec beside the Vitest suite. It does not install a hosted backend, auth vendor, analytics SDK, sync engine, settings library, crash reporter, or native SQLite addon without a product requirement. Those choices define data ownership, retention, deletion, consent, offline behavior, credentials, native build risk, and operating cost

The template already owns the common application-layer choices: ArkType validation, typed tRPC IPC, TanStack Router, Query, Form, and Virtual, Zustand, neverthrow, evlog, Vitest, and electron-updater. Do not add Zod, Redux, electron-log, another updater, or a second result type by habit. Replace an existing choice only when the migration solves a measured problem

## Shortlist by product need

This shortlist was rechecked against primary documentation on 2026-07-11. Recheck compatibility and release age when you adopt one

| Product need                  | First look                                                                                                                                                                | Why, and the guardrail                                                                                                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local relational data         | [Drizzle ORM](https://orm.drizzle.team/docs/sqlite/get-started-sqlite) + Node's [`node:sqlite`](https://nodejs.org/download/release/v24.21.0/docs/api/sqlite.html)        | Typed schemas and committed migrations without an ABI-bound addon. Node 24 calls `node:sqlite` release-candidate quality. Keep sustained synchronous work off the main event loop                                                        |
| Realtime hosted backend       | [Convex](https://docs.convex.dev/client/react/overview)                                                                                                                   | Strong typed functions and reactive subscriptions. It is a hosted architecture choice, not a durable offline mutation queue. Add an idempotent local outbox and reconciliation when offline-first writes matter                          |
| Small non-secret preferences  | [`electron-store`](https://github.com/sindresorhus/electron-store)                                                                                                        | Atomic, schema-validated JSON for settings. It rewrites the whole file, is not a database, and its `encryptionKey` is obfuscation, not secret protection                                                                                 |
| Tokens and local secrets      | Electron [`safeStorage`](https://www.electronjs.org/docs/latest/api/safe-storage)                                                                                         | Prefer the built-in asynchronous API from the main process. Account for key rotation, temporary provider failure, Windows same-user limits, and Linux fallback strength                                                                  |
| Desktop authentication        | [Better Auth Electron](https://better-auth.com/docs/integrations/electron)                                                                                                | A real Electron integration with system-browser PKCE, deep links, and Linux fallback. It requires a hosted Better Auth server. Keep tokens and cookies in main-process storage and expose only sanitized session state                   |
| Crash diagnostics             | [Sentry Electron](https://github.com/getsentry/sentry-electron)                                                                                                           | Covers main, renderer, and native failures. Decide consent, PII scrubbing, sampling, retention, release and channel tags, and CI-only source-map upload credentials before enabling it                                                   |
| Product analytics and flags   | [PostHog](https://posthog.com/docs/libraries/js)                                                                                                                          | Use only with an explicit analytics need and a consent and opt-out policy. Electron renderer builds must not load remote code. Flags are never authorization, and queued events are not durable                                          |
| Reactive client collections   | [TanStack DB](https://tanstack.com/db/latest/docs/overview)                                                                                                               | A natural extension when normalized live queries, optimistic transactions, or a sync engine become necessary. It is still beta. TanStack Query stays the simpler default                                                                 |
| End-to-end desktop tests      | Included [Playwright](https://playwright.dev/docs/api/class-electron), or the [WebdriverIO Electron service](https://webdriver.io/docs/desktop-testing/electron/) instead | The scaffold covers the production renderer and BrowserWindow security preferences. Playwright's Electron support is still experimental and does not intercept native dialogs. Prefer WDIO when its packaged-app helpers materially help |
| Native Node dependencies      | [`@electron/rebuild`](https://github.com/electron/rebuild)                                                                                                                | Add only when an ABI-bound addon is unavoidable. Rebuild after Electron upgrades and validate every OS and architecture in native CI. electron-builder already rebuilds production dependencies during packaging                         |
| Existing enterprise telemetry | [OpenTelemetry JS](https://opentelemetry.io/docs/languages/js/)                                                                                                           | Prefer manual main-process spans and an owned Collector when the organization already uses OTLP. The Node SDK and browser instrumentation still have experimental edges. Do not duplicate a primary Sentry integration by accident       |

Other credible but more architectural paths:

- [PGlite](https://pglite.dev/docs/), when local PostgreSQL semantics justify a WebAssembly database
- The ElectricSQL, PowerSync, RxDB, or TrailBase integrations described by [TanStack DB](https://tanstack.com/db/latest/docs/overview), when real offline-first synchronization is the actual product
- libSQL/Turso, another SQLite-sync family. Its native and prebuilt target matrix must cover every installer architecture before this template can advertise it

Before choosing one of these, evaluate worker and CSP behavior, conflict policy, backend ownership, payload size, licensing, and recovery

## Local data

The `electron/main/data/` scaffold is inert. Normal startup does not import it, create a file, or invent product tables. `openLocalDatabase()` applies defensive mode, foreign keys, a bounded busy timeout, WAL, and disabled extension loading

Before wiring it into a main-process service, define ownership, cardinality, retention, export, reset, uninstall, corruption recovery, and forward-migration behavior. Then:

1. Define product tables in `electron/main/data/schema.ts`
2. Run `pnpm db:generate`, review the numbered SQL, and commit it
3. Keep `pnpm db:check` green
4. Store the database below `app.getPath('userData')`
5. Apply migrations in production code before normal data access, and back up before risky changes

Generated SQL and metadata are packaged under `resources/migrations`. Never run `drizzle-kit push` against an end-user database

The official `drizzle-orm/node-sqlite` adapter is not in Drizzle's current stable `0.45.2` package. The template therefore pins both `drizzle-orm` and the development-only `drizzle-kit` exactly to the official `1.0.0-rc.4` line. The alternatives were hiding an unsupported adapter or adding an Electron ABI-bound SQLite addon. Re-evaluate this deliberate pre-release pin when Drizzle 1.0 becomes stable

Node 24's built-in SQLite avoids Electron ABI rebuilds, but `DatabaseSync` is synchronous. Short transactions can stay behind a narrow main-process tRPC service. Imports, search indexing, and sustained queries should run in an Electron [`utilityProcess`](https://www.electronjs.org/docs/latest/api/utility-process). Keep extension loading disabled unless a reviewed extension is essential

`better-sqlite3` is a credible performance alternative, not the default. At the July 2026 research snapshot, its release declared Node 24 support but did not publish a prebuild for the Electron ABI. It would need source rebuilding and native verification on the complete target matrix. Reconsider it when compatible prebuilds exist or benchmarks justify the operational cost

Neither `electron-store` encryption nor `safeStorage` transparently encrypts an entire SQLite database. Full-database encryption needs its own threat model and a maintained solution

## Cloud, auth, and telemetry

- Convex: A good reactive cloud backend when collaboration is the product requirement. Public functions still need authorization, deployment and admin keys stay in CI, and the client must use safe offline defaults. A reconnecting client is not the same as a crash-safe local write queue
- Desktop OAuth: Use the system browser and Authorization Code with PKCE, never a client secret or an auth webview. Better Auth is the generic self-hosted option here because it has an official Electron integration. Managed identity vendors stay product-specific evaluations
- Sentry: The first remote diagnostics option to evaluate. Upload source maps during the protected release pipeline, delete them from release artifacts, and keep its auth token out of the binary. Keep bounded local evlog diagnostics because cloud delivery is best-effort
- PostHog and OpenTelemetry: PostHog is for consented product analytics, cohorts, or flags, not crash reporting or authorization. OpenTelemetry makes most sense when an organization already owns an OTLP Collector and telemetry policy. Do not install Sentry, PostHog, and OpenTelemetry all together
- Update observability: Record discrete phases and durations, not every progress tick. A product that needs install-success metrics should persist a minimal pending-update marker right before installer handoff and confirm it on the next successful startup. Keep user data and private response bodies out of that marker

## Testing and native integrations

Vitest is the fast behavior-test baseline. The included Playwright spec is described in [Checks and tests](development.md#checks-and-tests). Extend it for preload, deep-link, updater UI, and packaged-binary behavior as those become product requirements. Playwright's Electron launcher requires CLI inspection, so do not weaken production fuses to run it. If WDIO's stronger packaged-app helpers are more valuable, replace Playwright instead of maintaining two E2E stacks

Native dependencies multiply platform, architecture, compiler, signing, and supply-chain work. Prefer Node and Electron built-ins such as `node:sqlite`, `safeStorage`, and `utilityProcess`. If a native addon is justified:

1. Review its prebuild matrix
2. Add its install script explicitly to `allowBuilds` in the [pnpm policy](development.md#pnpm-policy)
3. Rebuild it for Electron
4. Exercise it on every native CI runner before claiming support
