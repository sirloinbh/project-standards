# #308 Shared ESLint config 1.1.0: rules that need no install, and optional plugin arguments

## Change

| File | Content |
|---|---|
| `packages/eslint-config/index.mjs` | 2 convention rules (all files), 5 type-aware rules turned on by the `tsconfigRootDir` option, 3 optional plugin arguments |
| `packages/eslint-config/package.json`, `CHANGELOG.md`, `README.md` | 1.1.0 |
| `scripts/test/packages.test.mjs` | 3 rule checks for 1.1.0, updated the existing order check |

## Decisions

- If you keep using the 1.0.0 app config (`createConfig({ js, tseslint, globals, reactHooks, prettier }, { ignores })`) as it is, the only things newly turned on in 1.1.0 are the 2 convention rules. The 8 apps have 0 violations.
  - `@typescript-eslint/consistent-type-definitions: type`
  - No default exports (`no-restricted-syntax`). Tool config files (`*.config.*`) need a default export, so they are excluded.
- Type-aware rules are turned on only when `tsconfigRootDir` is passed. Because they do type checking, they apply only to `frontend/src` and `backend/src` (option `typedFiles`). Config files and scripts are not in tsconfig, so `projectService` cannot find them.
- Optional plugins add rules only when the app passes them. The package code can be published before the install approval (#245) without breaking apps.
  - `reactRefresh`: the `import { reactRefresh }` object of 0.5. Applies `configs.vite()` to frontend files.
  - `jsxA11y`: applies `configs.recommended` of `eslint-plugin-jsx-a11y-x` to frontend files (this config does not set `files`).
  - `importSort`: turns `simple-import-sort/imports` and `exports` on as `error`.
  - The API was checked with `npm view <package>@<version> readme` (read-only). Running with the real plugins is done in #246 after the install.
- The app template (`templates/app/eslint.config.mjs.tmpl`) was not changed this time. Passing `tsconfigRootDir` and the plugins is done in #246 together with the per-app violation fixes.

## Violations per app (type-aware rules, when `tsconfigRootDir` is passed)

| Rule | workout-memo | study-log | Other 6 | How to fix |
|---|---:|---:|---:|---|
| `no-unnecessary-type-assertion` | 16 | 4 | 2 (#244 research) | `eslint --fix` (automatic) |
| `require-await` | 4 | 1 | 1 to 2 (#244 research) | Remove `async` or add `await` |
| `no-floating-promises` | 1 | 0 | 0 | `await`, `.catch()`, or `void` |
| `no-misused-promises` | 1 | 0 | 0 | Do not pass a Promise directly to an event handler |

For workout-memo and study-log, I ran the 1.1.0 config as it is with the ESLint and typescript-eslint installed in the app, in this PC's app checkout, and counted (Node API, no install). There were no parse errors. The other 6 are the #244 research values.

## Release order (user)

1. When this PR is merged, push the tag `eslint-config/v1.1.0` (`publish.yml` publishes to GitHub Packages).
2. In #246, raise the app template and `versions.json` `packages.@sirloinbh/eslint-config` to 1.1.0. Turning on only the convention rules can be done right now, and the 8 apps pass.

## Checks

- `node --test scripts/test/packages.test.mjs`: 10 passed
- `npm run packages:check`: passed
- The result of `npm run check` is written in the PR
