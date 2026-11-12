# #246 Turn on the adopted ESLint and Prettier rules in the apps

## Change

| File | Content |
|---|---|
| `versions.json`, `docs/versions.md` | Added `eslint-plugin-jsx-a11y-x` 0.2.0, `eslint-plugin-react-refresh` 0.5.7, `eslint-plugin-simple-import-sort` 14.0.0, and `prettier-plugin-tailwindcss` 0.8.1 to the root `devDependencies` (42 shared app dependencies) |
| `templates/app/eslint.config.mjs.tmpl` | Passes the three plugins and `tsconfigRootDir` to `createConfig`. Import order follows the new sort rule |
| `templates/app/prettier.config.mjs.tmpl` | Replaces `.prettierrc.json.tmpl`. Loads the shared options JSON and adds only `prettier-plugin-tailwindcss` and `tailwindStylesheet` |
| `templates/app/.prettierignore.tmpl` | In the managed file list, `.prettierrc.json` becomes `prettier.config.mjs` |
| `packages/prettier-config/README.md`, `docs/design.md`, `docs/adr/0001-*.md`, `docs/tools.md`, `docs/dependency-policy.md` | New config file name and shared dependency count |
| `scripts/test/fixtures/sync-snapshot.json` | Sync snapshot |

## Decisions

- The rules are already in `@sirloinbh/eslint-config` 1.1.0 (#308). We do not publish a new package; the app template only passes the plugins. So no tag push is needed.
- The shared Prettier package is JSON, so it cannot add plugins. Instead of publishing a new version, we changed the app config file to `prettier.config.mjs`. Sync deletes the untouched `.prettierrc.json`.
- Install approval: #245 (2026-10-29). None of the four packages has an install script.
- Centrally managed files such as the shared UI components are also ESLint targets. If there are violations, fix them in the central `templates/`, not in the app.

## What to do in the sync PR

The sync PR adds the four packages to the app root `package.json` and leaves the lockfile as is. After the user installs with `--ignore-scripts` in a work folder with that branch (together with #263 knip), the agent continues.

1. Count violations with `npm run lint`. Fix import order and Tailwind class order with the automatic fixes (`npm run lint -- --fix`, `npm run format`).
2. Fix the remaining violations (accessibility, Promise handling, unnecessary type assertions) by hand. Fix violations in centrally managed files in the central `templates/`.
3. Commit the lockfile and the app fixes to the sync PR branch and merge when CI passes.

## Follow-up fix (first lint after the app install)

After installing in the 8 apps and running `npm run lint`, the config did not run at all. The template imported `eslint-plugin-react-refresh` as a default export, but the `configs.vite()` function exists only on the named export `reactRefresh` (use `import { reactRefresh }`, as the shared package README says).

| File | Content |
|---|---|
| `templates/app/eslint.config.mjs.tmpl` | `import { reactRefresh } from 'eslint-plugin-react-refresh'` |
| `templates/ui/frontend/src/**` | Automatic import order fix. Rule exception comments with reasons on the `*Variants` and `toast` exports next to components and on the `autoFocus` of Drawer |
| `scaffold/app/**` | Import order, `pages` is not exported (react-refresh), and mock functions without `async` in tests use `Promise.resolve` (require-await) |

This fix brings violations in centrally managed files to 0. The remaining violations are in app code and are fixed in each sync PR.

## Verification

- `npm run check`: recorded in the PR body below

## Follow-up fix (2026-10-29)

- The app template `eslint.config.mjs` imported `eslint-plugin-react-refresh` as a default, which stopped lint in the 8 apps. In 0.5, the default export's `configs.vite` is an object, not a function, so `reactRefresh.configs.vite()` fails. We changed it to the named export (`import { reactRefresh }`), the same way as the package README.
- `jsx-a11y-x/label-has-associated-control` treated a `<label>` wrapping the shared `Input` component as a label with no associated control. We added `settings['jsx-a11y-x'].components = { Input: 'input' }` to the template config to tell it that `Input` is a native `<input>`. This can move into `createConfig` in the next shared package version.
- Added `tailwindPreserveWhitespace: true` to the app Prettier config. Without it, prettier-plugin-tailwindcss removes the leading space in `` `row${on ? ' top' : ''}` `` and the class becomes `rowtop` (found in 2 places in study-log).
