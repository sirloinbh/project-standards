# #65 Four shared config packages and the package check

## Change

| File | Content |
|---|---|
| `packages/eslint-config/` | The `createConfig(plugins, options)` factory. The package imports nothing and takes the plugins the app installed as arguments. 6 peers pinned to exact versions |
| `packages/prettier-config/` | The same settings as the current `.prettierrc.json` of the 8 apps |
| `packages/tsconfig/` | `base`, `react-app` (frontend), `node-api` (backend). Same as the current compilerOptions. Peer `typescript` 5.9.3 |
| `packages/design-tokens/` | `tokens.css` (CSS variables, no Tailwind needed), `tailwind.css` (Tailwind 4 theme + h1–h4 base styles + `text-body`, `text-body-sm`, `text-caption`, `text-meta` utilities), Pretendard Variable 1.3.9 |
| `scripts/build-tokens.mjs` | Generates the two CSS files from `design/tokens.json` (supports `--check`). The 6 app theme colors have neutral defaults and are overridden in the app CSS |
| `scripts/package-guard.mjs` | 0 dependencies, no install scripts, exact versions (including peers), public packages, the GitHub Packages registry, `files` exist, a CHANGELOG entry, and the tag matches the version (`--tag`) |
| `templates/app/eslint.config.mjs.tmpl`, `.prettierrc.json.tmpl`, `frontend/tsconfig.json.tmpl`, `backend/tsconfig.json.tmpl` | Entry files for downstream repos. They only load the packages (moved from #52) |
| `templates/app/.npmrc.tmpl` x3 | Added the `@sirloinbh` registry and the `${NODE_AUTH_TOKEN}` line (moved from #52) |
| `package.json` | `tokens`, `tokens:check`, `packages:check`. Included in `npm run check` |
| `scripts/test/packages.test.mjs`, `fixtures/study-log/*`, `fixtures/sync-snapshot.json` | 7 tests, 4 study-log current config files, and the downstream repo file list (4 added per app) |

## Pretendard

- **Source:** the official release `Pretendard-1.3.9.zip` (SHA-256 `04be351a…428a`). After downloading into a new empty folder, I extracted only two files: `web/variable/woff2/PretendardVariable.woff2` (2.0MB) and `LICENSE.txt`.
- **License:** I confirmed from the LICENSE text that it is the SIL Open Font License 1.1. It is noted in the package `LICENSE.md`.
- **Why dynamic subsets are not used:** #121 originally planned to use dynamic subsets. But the official zip has no dynamic subsets; they are distributed only as an npm package and on a CDN. So I switched to using the one full variable font file. I also updated the description and file hash in `design/tokens.json`.

## Passed on to the next step

- The field management that puts `@sirloinbh/*` devDependencies into the app `package.json` is done at the first workout-memo sync (#97), after the packages are actually released. For now the package versions in `versions.json` are `null` (not released).
- Once the `${NODE_AUTH_TOKEN}` line in `.npmrc` is applied, npm commands fail on a PC without this environment variable. The first sync PR body must describe how to set it up (#97).

## Checks

- `npm run check`: 92 tests passed, `registry-check: ok`, 2 generated documents and 2 token CSS files up to date, `package-guard: ok`
- **Comparison with the study-log current files:**
  - The ESLint rules, Prettier settings, and frontend tsconfig are the same as the study-log current files.
  - In the backend tsconfig, only `outDir` is `${configDir}/dist`. It is a path relative to the inheriting side, so the actual result is the same `backend/dist` as before.
- **Tailwind compilation:** I actually compiled `tailwind.css` with Tailwind 4.3.3 (`@tailwindcss/node`) already installed in workout-memo. All 8 of these items came out as expected: `bg-primary`, `rounded-lg`/`rounded-sm`, `text-caption`, `@font-face`, h1 base style, the `md` breakpoint (48rem), and `bg-success`. No new packages were installed.
