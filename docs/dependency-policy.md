# Dependency policy

An npm supply-chain attack (the Shai-Hulud family) is ongoing, so dependencies are kept to a minimum, pinned to exact versions, and brought in only after verification.

## Version source

- The exact versions of the tools (Node, npm, PostgreSQL, images) and the 42 dependencies shared by the 8 apps are sourced from [`versions.json`](../versions.json). The table is generated as [versions.md](versions.md) (`npm run docs`).
- The shared app dependencies are managed fields in the 3 app `package.json` files. If even one app has a different version, `standards-check` fails (#304). To raise a version, edit the central `versions.json` and align the lockfile in the sync PR that opens for each app.
- A dependency used by only one app has its version set by that app. Major versions follow the table below.

| Package | Major | Apps that use it | Notes |
|---|---|---|---|
| @tanstack/react-query | 5 | workout-memo | |
| react-hook-form, @hookform/resolvers | 7, 5 | workout-memo | |
| @playwright/test, @axe-core/playwright | 1, 4 | workout-memo | Same version as the visual comparison image (`versions.json` `images.playwright`) |
| recharts | 3 | study-log | |

Why each shared dependency's major version was chosen: tailwindcss 4, lucide-react, radix-ui, sonner, vaul, and tw-animate-css follow [ADR-0007](adr/0007-shadcn-ui-icons-emoji.md), and typescript, eslint, and prettier follow the peer range of the `@sirloinbh/*` shared packages. zod uses 4 (#386, [survey](research/zod4.md)).

## How to write versions

- Write every dependency in `package.json` as an exact version (no `^` or `~`). `save-exact=true` in `.npmrc` makes new installs do this. Existing range versions are pinned to the installed version at the first sync (#63).
- Always install with `--ignore-scripts`. `ignore-scripts=true` in `.npmrc` enforces this.
- Agents (Claude Code, Codex) can run only `npm ci`, which installs exactly what the lockfile says, and other install commands are blocked by settings ([Blocking package installs by agents](agent-guardrails.md), #375). Approved installs that add a new package or change a version are run by the user directly.

## Procedure for bringing in a new external package or tool

1. Open an issue in the central repo (or the app repo concerned) and write why it is needed and the alternatives.
2. Investigate with read-only commands: `npm view <package>@<version> version time license repository.url maintainers scripts dependencies`.
3. Choose a version that meets all of these conditions.
   - Exact version
   - 14 days elapsed since release
   - No install scripts (`preinstall`, `install`, `postinstall`, `prepare`), or if there are, the reason is confirmed
   - Publisher and repository match the official project
4. If needed, pre-verify with socket.dev, Snyk Advisor, or deps.dev.
5. Leave the investigation result in the issue as a table and get **user approval**. Do not run `npm install`, `npx`, or `pnpm/yarn/bun install` without approval.
6. Install with `npm install --ignore-scripts <package>@<version>` and write the lockfile changes and the `ioc-scan` result in the PR.
7. In an app repo, align the `frontend/` and `backend/` lockfiles to the root lockfile with `npm run lockfiles:sync` (see [Sub-lockfiles](#sub-lockfiles-frontend-backend) below).

Exception: own packages (`@sirloinbh/*`) are verified by provenance checks instead of the 14-day rule ([ADR-0004](adr/0004-own-packages-provenance-instead-of-14-days.md)). External peerDependencies of own packages follow the procedure above as is.

## Sub-lockfiles (frontend/, backend/)

An app repo has three lockfiles. CI installs with the root `package-lock.json`, and the production Docker build installs with `frontend/package-lock.json` and `backend/package-lock.json`. If they differ, the versions CI checked and the versions in the production image differ (#303).

- `standards-check` (`npm run standards:check`, CI) checks that the sub-lockfiles use the same versions as the root lockfile. Differences in package location (hoisting) are ignored, and only the versions that get installed are compared. It fails if they differ.
- `npm run lockfiles:sync` (`node .standards/lockfiles.mjs --write`) rewrites only the differing sub-lockfiles to the root lockfile's versions. **It downloads and installs nothing.** It copies `resolved` and `integrity` from the root lockfile as they are, and recomputes only the location and the `dev` and `optional` marks. Files that already match are not touched.
- Run without `--write`, it only shows the differing packages.
- In the central repo, the same check is run with `node scripts/lockfiles.mjs --root <app folder>`.

## Automatic updates

- Dependabot is used for **security updates only**. Version-bump PRs are turned off (`open-pull-requests-limit: 0`, template `.github/dependabot.yml`).
- Security updates are turned on in the repo settings (#22). Security PRs opened by Dependabot are also merged by the user after the conditions above are checked.
- Version bumps are done only through the central repo's sync PR.

## Regular checks

- CI runs `ioc-scan` every time to check lockfiles, install scripts, and workflows (#76).
- CI runs knip every time (`npm run knip`, config in the centrally managed file `knip.json`) to find unused files, exports, and dependencies (#263). At first it only warns. Unused dependencies only add Dependabot PRs and vulnerabilities to handle, so delete them when found. Centrally managed files (`.standards/`, common UI components and helpers, `frontend/public/`) are excluded from the check.
- The compliance report (#82) collects the `npm audit` result for each repo.
