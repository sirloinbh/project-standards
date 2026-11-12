# #263 Find unused files, exports, and dependencies in app CI (knip)

## Change

| File | Content |
|---|---|
| `versions.json` | `dependencies.root.devDependencies.knip` 6.41.0 (38 shared app dependencies) |
| `templates/index.json` | Added `scripts.knip` (`knip`) to the managed fields of the app root `package.json` |
| `templates/app/knip.json` | New managed file. Centrally managed files (`.standards/`, `frontend/public/`, shared UI components, layouts, and helpers) are excluded from the check |
| `templates/app/.prettierignore.tmpl` | Added `knip.json` to the managed file list |
| `.github/workflows/reusable-app-ci.yml` | A knip step after `npm run check` in the `verify` job. Even if it fails, it only gives a warning (`::warning`) |
| `docs/dependency-policy.md`, `docs/design.md` | knip in the regular checks; shared dependency count 37 to 38 |
| `scripts/test/` | Managed field expectations and the sync snapshot |

## Decisions

- Install approval: #245 (2026-10-29). knip 6.41.0 is the newest version that is more than 14 days past release, and none of its 62 dependencies has an install script.
- knip finds entry files itself from the `package.json` scripts and the Vite, Vitest, Playwright, and ESLint configs. One shared config works even if each app has different entry files.
- At first it gives only warnings. After seeing each app's first result and refining the config, we switch to failing for apps whose result is 0 (separate issue).

## What to do in the sync PR

The sync PR adds `knip` to the app root `package.json` and leaves the lockfile as is. On that PR branch, the user installs with `--ignore-scripts` to update the lockfile (together with #246), and then the agent records the first result of `npm run knip` in #263.

## Verification

- `npm run check`: recorded in the PR body below
