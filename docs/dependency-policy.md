# Dependency policy

An npm supply-chain attack (the Shai-Hulud family) is ongoing, so dependencies are kept to a minimum, pinned to exact versions, and brought in only after verification.

## Version source

- The exact versions of the tools (Node, npm, PostgreSQL, images) and the 42 dependencies shared by the 8 apps are sourced from [`versions.json`](../versions.json). The table is generated as [versions.md](versions.md) (`npm run docs`).
- The shared app dependencies are managed fields in the 3 app `package.json` files. If even one app has a different version, `standards-check` fails (#304). To raise a version, edit the central `versions.json` and align the lockfile in the sync PR that opens for each app.
- A dependency used by only one app has its version set by that app. Major versions follow the table below.

| Package | Major | Apps that use it | Notes |
|---|---|---|---|
| @tanstack/react-query | 5 | all 8 apps (workout-memo now; the other 7 as their adoption issues land) | [ADR-0027](adr/0027-react-query-for-data-loading.md); version in `versions.json` `optionalDependencies` |
| react-hook-form, @hookform/resolvers | 7, 5 | workout-memo | |
| @playwright/test, @axe-core/playwright, @lhci/cli, concurrently | 1, 4, 0, 9 | all 8 apps | Pinned in `versions.json` `dependencies.root`. `@playwright/test` must equal the visual comparison image version (`images.playwright`); `registry:check` fails otherwise |
| @testing-library/user-event | 14 | workout-memo, dev-career-portfolio | In `versions.json` `optionalDependencies`: applied only where the app already has it |
| zod (frontend) | 4 | the apps with `features.contract` (the frontend copy of `contract.ts` imports it) | In `versions.json` `optionalDependencies`: applied only where the frontend already lists it, so an app without a contract gets none (#783). The backend `zod` stays in `dependencies` |
| recharts | 3 | study-log | |
| pg-boss | 12 | money-ledger (`features.jobs`) | backend only; [ADR-0018](adr/0018-job-runner-pg-boss.md), [jobs.md](jobs.md) |

Why each shared dependency's major version was chosen: tailwindcss 4, lucide-react, radix-ui, sonner, vaul, and tw-animate-css follow [ADR-0007](adr/0007-shadcn-ui-icons-emoji.md), and typescript, eslint, and prettier follow the peer range of the `@sirloinbh/*` shared packages. zod uses 4 (#386, [survey](research/zod4.md)).

## How to write versions

- Write every dependency in `package.json` as an exact version (no `^` or `~`). `save-exact=true` in `.npmrc` makes new installs do this. Existing range versions are pinned to the installed version at the first sync (#63).
- Always install with `--ignore-scripts`. `ignore-scripts=true` in `.npmrc` enforces this.
- Agents (Claude Code, Codex) can run `npm ci` (#375) and `npm install --ignore-scripts --save-exact` (#629, user decision 2026-11-18). Update, uninstall, exec, and npx are blocked by settings ([Blocking package installs by agents](agent-guardrails.md)). The procedure below still applies to every new package: the agent runs the checks itself and records them, and the user approval step is replaced by the issue record unless the issue marks it as user confirmation.

## Procedure for bringing in a new external package or tool

1. Open an issue in the central repo (or the app repo concerned) and write why it is needed and the alternatives.
2. Investigate with read-only commands: `npm view <package>@<version> version time license repository.url maintainers scripts dependencies`.
3. Choose a version that meets all of these conditions.
   - Exact version
   - 14 days elapsed since release
   - No install scripts (`preinstall`, `install`, `postinstall`, `prepare`), or if there are, the reason is confirmed
   - Publisher and repository match the official project
4. If needed, pre-verify with socket.dev, Snyk Advisor, or deps.dev.
5. Leave the investigation result in the issue as a table. A package outside what the user already approved needs **user approval** (a comment on the issue). Never run `npx` or `pnpm/yarn/bun install`.
6. Install with `npm install --ignore-scripts --save-exact <package>@<version>` and write the lockfile changes and the `ioc-scan` result in the PR.

Exception: own packages (`@sirloinbh/*`) are verified by provenance checks instead of the 14-day rule ([ADR-0004](adr/0004-own-packages-provenance-instead-of-14-days.md)). External peerDependencies of own packages follow the procedure above as is.

## Licenses

An app may depend on a package only when its license is on this allow list (#1062): `MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `Apache-2.0`, `0BSD`, `BlueOak-1.0.0`, `CC0-1.0`, `Unlicense`, `Python-2.0`, `CC-BY-4.0`. The list lives in `scripts/license-check.mjs` (`ALLOWED`); a test keeps it equal to this paragraph.

- An SPDX expression passes when it is covered: `A OR B` needs one allowed side, `A AND B` needs both, `X WITH exception` counts as `X`.
- App CI runs `node .standards/license-check.mjs` after `npm ci`. For now it only **warns** (a `::warning` line per package) and never fails CI; `--strict` makes it fail, to be switched on later once the apps are clean. Own `@sirloinbh/*` packages are skipped.
- A package outside the list (copyleft such as GPL or AGPL, no license declared, or a license not listed): do not add it. If it is already there, record it in the app repo's issue with the reason and the alternative. To allow a new license, change the list in the central repo in one PR (script, this paragraph, and the test together).
- CI also keeps a CycloneDX SBOM of the lockfile as the workflow artifact `sbom` (`npm sbom --sbom-format cyclonedx`, built into npm 10, 30 days).

## One lockfile

An app repo has one lockfile, the root `package-lock.json`. CI and both production Docker builds install from it (`docker build -f frontend/Dockerfile .` and `-f backend/Dockerfile .` use the repo root as the context, with `npm ci -w <workspace>`), so the versions CI checked are the versions in the production image (ADR-0022, #770). The earlier `frontend/` and `backend/` sub-lockfiles and `npm run lockfiles:sync` are gone.

## Automatic updates

- Dependabot is used for **security updates only**. Version-bump PRs are turned off (`open-pull-requests-limit: 0`, template `.github/dependabot.yml`).
- Security updates are turned on in the repo settings (#22). Security PRs opened by Dependabot are also merged by the user after the conditions above are checked.
- Version bumps are done only through the central repo's sync PR.

## Regular checks

- CI runs `ioc-scan` every time to check lockfiles, install scripts, and workflows (#76).
- CI runs knip every time (`npm run knip`, config in the centrally managed file `knip.json`) to find unused files, exports, and dependencies (#263). At first it only warns. Unused dependencies only add Dependabot PRs and vulnerabilities to handle, so delete them when found. Centrally managed files (`.standards/`, common UI components and helpers, `frontend/public/`) are excluded from the check.
- The compliance report (#82) collects the `npm audit` result for each repo.
