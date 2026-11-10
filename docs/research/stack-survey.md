# Comparing the dependencies and tech stacks of the 8 apps (#240)

Surveyed on 2026-10-28. I read the 3 `package.json` files (root, `frontend/`, `backend/`) and 3 lockfiles from `origin/main` of the 8 app repos and compared them. Nothing was installed. Adopted candidates are listed under "Decisions" at the bottom and will be registered as implementation issues.

## 1. Direct dependencies: already the same

The 8 apps declare 52 direct dependencies in total. **The 41 used by all 8 apps are identical down to the version.** This is because the scaffold (#85) and the sync PR (#63) created them with the same versions. No app uses a different library for the same purpose.

| Group | Packages (common to all 8 apps, same versions) |
|---|---|
| Frontend | react, react-dom 19.3.0, react-router 8.4.0, vite 6.4.4, tailwindcss, @tailwindcss/vite 4.3.3, radix-ui 1.7.0, lucide-react 1.52.0, sonner 2.0.8, vaul 1.1.2, class-variance-authority 0.7.1, clsx 2.1.1, tailwind-merge 3.7.0, tw-animate-css 1.4.0, @sirloinbh/design-tokens 1.0.0 |
| Frontend tests | vitest 5.0.3, jsdom 30.1.2, @testing-library/react 16.3.3, dom 10.4.2, jest-dom 7.0.1 |
| Backend | express 5.3.0, pg 8.23.1, zod 3.25.76, tsx 4.23.15, @types/express, node, pg |
| Root tools | eslint 10.12.0, @eslint/js, typescript-eslint 8.71.2, eslint-plugin-react-hooks, eslint-config-prettier, globals, prettier 3.9.10, concurrently 9.2.5, @sirloinbh/eslint-config, prettier-config, tsconfig 1.0.0, typescript 5.9.3 |

11 dependencies are used by only one app. They follow from app features, so they are not candidates for sharing.

| App | Packages |
|---|---|
| workout-memo | @tanstack/react-query, react-hook-form, @hookform/resolvers, zod (frontend), tesseract.js, @playwright/test, @axe-core/playwright, @testing-library/user-event |
| study-log | @anthropic-ai/sdk (backend), react-markdown, recharts, pdfjs-dist |

Note: file-control (outside the registry) is a Node CLI with no dependencies at all (`engines.node: >=22`). I left it out of the comparison.

**Problem:** They are the same now, but nothing checks that they stay the same. The only source of versions is the table in the docs (`docs/dependency-policy.md`), which a machine cannot read. That table is already out of date. For example, it says "the app-installed lucide-react is still 0.468.0", but all 8 apps are now on 1.52.0.

## 2. Lockfiles: production builds use separate files

Each app has 3 lockfiles.

- Root `package-lock.json`: the whole npm workspaces setup. Used by local development and CI.
- `frontend/package-lock.json`, `backend/package-lock.json`: the Docker build looks only at the `frontend/` and `backend/` folders and installs with `npm ci`. So **the production image is installed from the sub-lockfiles.**

I compared the installed versions in the root lockfile and the sub-lockfiles. Values caused only by package location differences (esbuild, ansi-styles, lru-cache) were left out.

| App | Different versions in frontend | Different versions in backend |
|---|---:|---:|
| workout-memo | 7 (undici 8.11.2→8.12.3, @babel/runtime, tldts, and other patches) | 0 |
| The other 7 | 0 | 0 |

- In workout-memo only the root was updated, and `frontend/package-lock.json` did not follow. So the version CI tested differs from the production image version.
- Dependabot also opens a separate PR for each lockfile (the `/backend` and `/frontend` labels in section 3 below). The same update is opened twice.

## 3. Open dependency PRs (2026-10-28, `node tools/dependency-prs.mjs list`)

| Package | Change | Kind | PR count | Notes |
|---|---|---|---:|---|
| body-parser | 2.3.0 → 2.4.0 | Minor (security) | 16 | A sub-dependency of express. 2 per app, root and backend |
| zod | 3.25.76 → 4.6.6/4.6.7 | Major | 17 | A major that changes the API. Policy requires 14 days, an issue, and the workout-memo-first procedure |
| undici | 8.11.2 → 8.12.3 | Minor | 1 | workout-memo `/frontend` only. Same as the difference in section 2 |

These PRs were opened before the grouping settings (#274) were synced.

## 4. Candidates for sharing

| # | Candidate | Approach | Effect | Verdict |
|---|---|---|---|---|
| A | Move the versions of the 41 common dependencies into a machine-readable source and check them | Add a `dependencies` entry to `versions.json` + `standards-check` compares it with each app's `package.json` | If only one app's version drifts, CI catches it. The docs table becomes generated output | **Recommended** |
| B | Check that sub-lockfiles match the root lockfile | Add a comparison to `standards-check` (ignore package location differences) | Catches mismatches between the production image and CI versions | **Recommended** |
| C | A command that regenerates sub-lockfiles from the root | A central tool extracts only the workspace part from the root lockfile and writes it | A way to fix the drift in section 2. Rewrites files only, without installing | Recommended together with B. If it is hard, do only B and the user fixes drift with `npm install` |
| D | Raise body-parser 2.4.0 centrally in one go and close the 16 Dependabot PRs | Only lockfiles change (the user runs the install) | Reduces 16 security updates to 8 PRs | **Recommended** (includes a user step) |
| E | Decide whether to move to zod 4 | Major upgrade procedure (`docs/stack.md`) | Whether to close the 17 PRs or migrate | **Decision needed.** Recommendation: stay on 3 for now and close the 17 zod PRs with the reason written. Migration is a separate issue |
| F | Add libraries used by only one app to the common recommended list | Docs only (`docs/stack.md`) | New apps pick the same library for the same purpose | Most are already in the table. Only fix the outdated "in use" column of the table (done in this PR) |

## Decisions

- On 2026-10-28 the user adopted the recommendations in section 4.
- A: #304
- B, C: #303
- D: #305 (the user merges the Dependabot PRs)
- E: keeping zod 3 and closing the open zod 4 PRs is #306. Whether to migrate is decided separately in #307.
- F: not doing (the outdated docs column is fixed in #298)
