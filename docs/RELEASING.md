# Releasing

Read this when you prepare the first release, cut a stable or beta release, or recover from a bad one. It is the maintainer runbook for apps built from this template

Releases use one protected default branch, strict Semantic Versioning, two [update channels](updates.md), native builds on each operating system, and one manually approved GitHub publication job. GitHub Releases hosts the update artifacts

## Before the first release

Replace every occurrence of the template URL:

```text
https://github.com/example-owner/example-electron-app
```

The `repository` field in `package.json` must identify the repository that runs the workflow. The release preflight rejects the example URL and any mismatch with `github.repository`. This prevents publishing binaries whose embedded updater configuration points somewhere else

Then configure these GitHub repository settings by hand:

1. Allow GitHub Actions, and allow the workflow `GITHUB_TOKEN` to receive write access when a job explicitly requests it. The workflow defaults to `contents: read`. Only the final publication job requests `contents: write`
2. Create an environment named `release`. Require trusted reviewers, prevent self-approval when appropriate, restrict deployment to the default branch, and prevent administrators from bypassing the rules if your plan supports it
3. Enable immutable releases. The workflow passes all assets to `gh release create`, which creates a draft, uploads the assets, and publishes only after the uploads succeed. Once a release is published, never move its tag or replace its assets
4. Protect the default branch. Require pull requests, at least one independent approval, successful validation checks including the [CI check](development.md#continuous-integration), resolved conversations, and linear history. Disable force-pushes and branch deletion
5. Enable squash merging and disable merge commits. Use the pull request title as the squash commit title. Add a merge queue only when contributor volume makes frequent stale-branch rebuilds expensive. A small team does not need one
6. Create the labels used by `.github/release.yml`: `security`, `breaking-change`, `semver-major`, `enhancement`, `feature`, `semver-minor`, `bug`, `fix`, `semver-patch`, `dependencies`, and `skip-changelog`
7. Consider CODEOWNERS rules for the release workflow, builder configuration, lockfile, updater, and this document
8. Configure [signing](#signing)

The default workflow publishes to the same public repository. For a separate release repository, replace the same-repository `GITHUB_TOKEN` design with a narrowly scoped GitHub App or fine-grained token, and review the updater configuration as a separate architecture decision. [GitHub update provider](updates.md#github-update-provider) covers why the update repository must be public

## Version and tag policy

`package.json` is the version source of truth. The release workflow accepts exactly these tag forms:

```text
vMAJOR.MINOR.PATCH
vMAJOR.MINOR.PATCH-beta.NUMBER
```

- `v1.4.0` creates a full stable release and `latest` update metadata
- `v1.5.0-beta.1` creates a GitHub prerelease and `beta` update metadata

All numeric identifiers use canonical decimal form and beta numbering starts at one. So `v01.2.3`, `v1.2.3-beta.0`, `v1.2.3-beta.01`, `v1.2`, `v1.2.3-rc.1`, and `v1.2.3+build.4` are rejected. Build metadata is excluded because SemVer ignores it when deciding update precedence. The tag without its leading `v` must equal `version` in `package.json`

Use this progression for a feature release:

```text
1.5.0-beta.1 -> 1.5.0-beta.2 -> 1.5.0
```

After `1.5.0`, the next feature beta is normally `1.6.0-beta.1`. A compatible production fix is `1.5.1`. Never reuse a version, move a published tag, or replace assets for an existing version

## Pull requests and patch notes

Keep `main` releasable and use short-lived branches. Each pull request should:

1. Have a concise, user-readable title that works as a squash commit title and in generated release notes
2. Carry one primary release-note label. Use `skip-changelog` only for changes with no user or operator relevance
3. Add a concise entry under `[Unreleased]` in `CHANGELOG.md` for a user-visible behavior, security, migration, packaging, or operational change. Do not turn raw commit messages into user patch notes
4. Include tests and migration or rollback notes in proportion to the change

GitHub categorizes merged pull requests and lists contributors using `.github/release.yml`. `CHANGELOG.md` stays the curated source for highlights, migrations, and operational warnings. During publication, the workflow extracts the exact version section and prepends it to GitHub's generated notes

For a release pull request:

1. Choose the stable or beta version and update `package.json`. Update the lockfile through pnpm if it records the root version
2. Move the relevant `[Unreleased]` entries into `## [VERSION] - YYYY-MM-DD`, then restore an empty `[Unreleased]` section
3. Update the comparison links at the bottom of `CHANGELOG.md`
4. Run `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm test`
5. Merge the approved release pull request with squash merge. Do not create the tag by hand

## Running the release

From the Actions tab, select **Release desktop app**, choose the default branch, and enter the tag that matches the merged package version. The workflow then:

1. Validates the branch, the strict tag, the package version, the dated changelog section, the repository URL, the source SHA, and that the tag does not exist yet. A run not dispatched from the default branch fails
2. Installs the pinned toolchain from the frozen lockfile and runs formatting, lint, type checking, and tests
3. Builds on `ubuntu-24.04`, `windows-2025`, and `macos-15` with builder publication disabled. Build jobs do not receive a GitHub publication token. Before packaging, each runner launches the production Electron-window test (Linux runs it through Xvfb). After packaging, each runner inspects the package structures without installing them
4. Passes the derived `UPDATE_CHANNEL` (`latest` or `beta`) to the builder and uploads short-lived workflow artifacts
5. Waits for approval on the protected `release` environment
6. Verifies all 16 primary files, the four channel manifests, and every payload the manifests reference. It flattens the assets, rejects filename collisions, and creates `SHA256SUMS.txt`
7. Creates the tag at the validated commit and publishes the complete GitHub release in one final write. Beta tags become GitHub prereleases that are explicitly not marked Latest. Stable tags become full releases marked Latest

This single-writer design avoids half-published releases when one platform fails. Publication is globally serialized, and an in-progress publication is never cancelled. If a build fails, no tag or GitHub release is created. If the final GitHub call leaves a draft because of an external failure, inspect and remove that draft before you retry. Never point an existing tag at a different commit

## Packages

Artifacts are written to `release/{version}/` with URL-safe names that contain the platform and architecture:

| Platform | Architecture targets  | Outputs for each target      | Primary files | Distribution role                                    |
| -------- | --------------------- | ---------------------------- | ------------- | ---------------------------------------------------- |
| Windows  | x64                   | NSIS per-user installer      | 1             | Direct installer and updater-compatible payload      |
| macOS    | x64, arm64, universal | DMG, PKG, and an updater ZIP | 9             | Direct installers plus required updater payloads     |
| Linux    | x64, arm64            | AppImage, DEB, and RPM       | 6             | Portable, Debian-family, and RPM-family distribution |

- The 16 primary files are 13 direct packages or installers plus three macOS updater ZIPs. The ZIPs are not installers. electron-updater requires ZIP payloads for macOS updates. PKG is an additional direct-download installer
- There are four channel manifests. Windows has one. The three macOS targets share one consolidated manifest whose file list electron-builder merges. Linux has separate x64 and arm64 manifests
- Differential-update blockmaps (where electron-builder emits them) and `SHA256SUMS.txt` are additional release assets
- Filenames use platform-native architecture tokens. Linux x64 is `x86_64` for AppImage and RPM and `amd64` for DEB. Linux arm64 is `arm64`, except RPM, which uses `aarch64`

The build jobs run non-installing integrity checks before upload:

- macOS: `hdiutil`, `pkgutil`, and `unzip` inspect every architecture output
- Linux: `dpkg-deb`, `rpm`, and ELF metadata inspect every architecture output
- Windows: PowerShell verifies the PE header, plus Authenticode when signing is configured

The publication job then requires every expected architecture-specific filename and every payload that the update metadata references. Missing or colliding assets stop the release before the tag is created

### Platform limits

- Run each `build:*` script on its native operating system
- Linux CI installs the package tools needed for construction and inspection, plus Xvfb for the host-architecture Electron window test
- Linux arm64 outputs are cross-packaged on the x64 Linux runner. The template has no native Node addon today, so the builder can assemble them, but structural validation is not a runtime test. Install and launch each arm64 format on real target systems before you claim ARM support
- Any native Node addon needs per-architecture rebuilds and tests before you add it
- Electron 44 stopped publishing Linux armv7l and Windows x86 binaries, so the template builds no 32-bit targets. armv7l was removed from the builder, the workflow inventory, the updater manifests, and the support policy together
- Electron 44 requires macOS 13 or later
- Windows ARM is left out of the shared GitHub feed. The current Windows updater metadata is not architecture-qualified, so a mixed x64 and ARM feed needs a deliberate separate-feed design before it is safe to advertise
- The NSIS uninstaller keeps application data by default. A product that wants a "remove my data" action should implement and confirm it in the UI instead of silently deleting user data on uninstall

### Opt-in package formats

The default formats are the direct-download formats this workflow can build and inspect on native hosted runners. electron-builder recognizing a target name does not prove the app works in that ecosystem. Add the targets below only after the product owns their configuration, credentials, and target-system tests. Pacman, Flatpak, and Snap need their own pinned target environments, not ad hoc additions to the default release job

| Opt-in target               | Why it is not a template default                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mas` / `mas-dev`           | Requires App Sandbox behavior and entitlements, provisioning profiles, Store certificates and identities, and App Store-managed updates                                                                                                          |
| Snap                        | Requires product-specific plugs and confinement, Snapcraft build isolation and infrastructure, Store credentials, and a separately owned Snap Store release path. Use the current `snapcraft` configuration. The legacy `snap` key is deprecated |
| Flatpak                     | Requires a pinned runtime and SDK, `flatpak-builder`, product-specific `finishArgs`, sandbox testing, and a Flathub or owned repository plan. electron-builder creates a standalone bundle, not a Flathub repository package                     |
| Pacman                      | The electron-builder target is currently beta. It needs an Arch install and start test plus `bsdtar` before support is advertised                                                                                                                |
| APK                         | Alpine uses musl. Validate Electron and every native dependency on Alpine instead of treating FPM output as runtime proof                                                                                                                        |
| FreeBSD / P5P               | These wrappers target FreeBSD and Solaris/illumos, not generic Linux. They need supported runtime binaries and native testing                                                                                                                    |
| `7z`, `zip`, `tar.*`, `dir` | Archives and unpacked directories are transport, custom-distribution, or debugging outputs, not installers. The macOS ZIP is kept only because the updater requires it                                                                           |

## Signing

Unsigned packages are useful only for template development. The workflow reads these optional secrets:

| Secret                           | Purpose                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `WIN_CSC_LINK`                   | Base64 or supported location for a Windows Authenticode signing certificate       |
| `WIN_CSC_KEY_PASSWORD`           | Windows certificate password                                                      |
| `MAC_CSC_LINK`                   | Base64 or supported location for a Developer ID certificate                       |
| `MAC_CSC_KEY_PASSWORD`           | macOS certificate password                                                        |
| `MAC_INSTALLER_CSC_LINK`         | Base64 or supported location for a Developer ID Installer certificate used by PKG |
| `MAC_INSTALLER_CSC_KEY_PASSWORD` | Developer ID Installer certificate password                                       |
| `APPLE_API_KEY_BASE64`           | Base64 contents of the App Store Connect `.p8` key for notarization               |
| `APPLE_API_KEY_ID`               | App Store Connect key ID                                                          |
| `APPLE_API_ISSUER`               | App Store Connect issuer ID                                                       |

The secrets are optional so a newly generated template can exercise unsigned packaging. Unsigned output is not a production release:

- macOS auto-update requires a properly signed app, and public macOS distribution should also be notarized
- PKG signing needs the separate Developer ID Installer identity in the `MAC_INSTALLER_*` secrets. The Developer ID Application identity used for the `.app` is not interchangeable
- Windows releases should be Authenticode-signed so updater publisher verification and operating-system trust prompts behave as intended. Azure Artifact Signing is a valid alternative but needs its own builder and identity configuration

Before a real product release, make missing signing credentials fail. Either require the secrets in a product-specific release preflight or make the builder configuration fail when signing is absent

Signing secrets are currently repository or organization secrets because the platform jobs need them before the final publication approval. The `release` environment protects publication, not the use of repository secrets. For stronger separation, protect the signing jobs with dedicated environments or move signing into reviewed reusable workflows

## Promotion, hotfixes, and recovery

To promote `1.5.0-beta.N`, merge a release pull request for `1.5.0` and run the stable tag. SemVer ranks the stable build above prereleases with the same base version, so beta users converge on it while stable users never saw the beta. Beta users with a stored choice stay on the next beta line after promotion unless the product mounts the [channel control](updates.md#channel-control-and-stored-choice) and they select Stable

For a production hotfix, branch from the protected release source if `main` has incompatible unreleased work. Otherwise fix it on `main`. Release a higher patch such as `1.5.1`. Create a maintenance branch only when the product has explicitly committed to support an older major or minor line. Do not adopt permanent GitFlow branches by default

There is no rollback by replacing assets. If `1.5.1` is bad, fix forward as `1.5.2`. Some users may already have installed the bad build, and updater version checks are monotonic. For a severe incident, unpublish only after evaluating what already-installed clients will do, communicate through the release and security channels, and ship the higher repair version as soon as possible

electron-updater supports staged percentages by changing update manifests, but immutable GitHub release assets cannot be edited to ramp that percentage. This template therefore uses beta as its test cohort and stable as an all-user release. If mutable progressive rollout becomes a requirement, evaluate a generic object-storage provider and its authentication, cache invalidation, reconciliation, and rollback behavior instead of weakening GitHub release immutability

## Primary references

- [Semantic Versioning 2.0.0](https://semver.org/)
- [electron-builder target selection](https://www.electron.build/docs/targets/)
- [electron-builder auto-update](https://www.electron.build/docs/features/auto-update/)
- [electron-builder release channels](https://www.electron.build/docs/tutorials/release-using-channels/)
- [electron-builder multi-platform builds](https://www.electron.build/docs/features/multi-platform-build/)
- [electron-builder macOS PKG](https://www.electron.build/docs/pkg/)
- [electron-builder Mac App Store](https://www.electron.build/docs/mas/)
- [electron-builder Snap](https://www.electron.build/docs/snap/)
- [electron-builder Flatpak](https://www.electron.build/flatpak/)
- [GitHub manually triggered workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
- [GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
- [GitHub generated release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes)
