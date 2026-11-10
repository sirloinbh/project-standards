# Candidates to strengthen the shared ESLint and Prettier config (#244)

Surveyed on 2026-10-28. This document is a comparison and a recommendation. The decisions the user confirmed are written under "Decisions" at the bottom; package install approval happens in #245, and applying the shared config happens in #246. Nothing was installed during the survey. Package information was gathered with read-only `npm view`, the deps.dev API, and the npm downloads API.

## Current state

- `@sirloinbh/eslint-config` 1.0.0: `@eslint/js` recommended, `typescript-eslint` recommended (no type information), unused variables, 2 React Hooks rules, `eslint-config-prettier`.
- `@sirloinbh/prettier-config` 1.0.0: sets only quotes, commas, and line length. No plugins.
- ESLint is 10.12.0. **A plugin that does not list ESLint 10 in its peerDependencies makes `npm install` stop on a peer conflict.** The app `.npmrc` has no `legacy-peer-deps`, and it is best not to add it.

## 1. Verdict per candidate

| Candidate | New packages | What it catches | Verdict |
|---|---|---|---|
| Some typescript-eslint type-aware rules | None (already installed) | Unhandled Promises, Promises passed incorrectly, unnecessary type assertions | **Recommend adopting** |
| The whole typescript-eslint `recommendedTypeChecked` | None | The above + `no-unsafe-*` (any propagation) | On hold. See section 2 below |
| `eslint-plugin-react-refresh` | 1 | Exports that break Vite fast refresh (exporting non-components from a component file) | **Recommend adopting** |
| Accessibility: `eslint-plugin-jsx-a11y-x` | 1 (+7 sub-dependencies) | Missing alt text, click-only divs, wrong ARIA | **Recommend adopting** (the fork instead of the original, see below) |
| Accessibility: `eslint-plugin-jsx-a11y` (original) | 1 (+15 sub-dependencies) | Same as above | Not recommended. No ESLint 10 support (peer up to `^9`), no release since 2024-10 |
| Import sorting: `eslint-plugin-simple-import-sort` | 1 (0 sub-dependencies) | Import order. Auto-sorts with `--fix` | **Recommend adopting** |
| Import sorting: `eslint-plugin-perfectionist` | 1 (+3) | Sorts object and type keys as well as imports | Not recommended. Too broad, and the latest 5.13.0 is less than 14 days old |
| `eslint-plugin-import-x` | 1 (+9) | Circular imports, missing modules | Not recommended. Heavy (1 MB) and overlaps with type checking (`tsc`) |
| `prettier-plugin-tailwindcss` | 1 (0 sub-dependencies) | Sorts Tailwind classes into the official order | **Recommend adopting** |

Why I chose the accessibility fork: the original `eslint-plugin-jsx-a11y` has more than 40 million weekly downloads but does not declare support for ESLint 10. Installing it requires `--legacy-peer-deps`, which also hides other peer conflicts. `eslint-plugin-jsx-a11y-x` is a fork by the es-tooling organization (the e18e ecosystem cleanup project), supports ESLint 9 and 10, and has npm provenance. On the downside, it has fewer users (about 240,000 weekly). If the original adds ESLint 10 support, going back to the original is an option.

## 2. Violation counts in the 8 apps (counted with installed packages)

typescript-eslint 8.71.2 is already installed in each app, so I turned on `recommendedTypeCheckedOnly` without installing anything and counted `frontend/src` and `backend/src` (based on local checkouts on this PC, 2026-10-28).

| Rule | workout-memo | study-log | The other 6 (per app) |
|---|---:|---:|---:|
| `no-floating-promises` (unhandled Promise) | 1 | 0 | 0 |
| `no-misused-promises` (Promise where a boolean or callback is expected) | 1 | 0 | 0 |
| `await-thenable` | 0 | 0 | 0 |
| `no-unnecessary-type-assertion` | 16 | 4 | 2 |
| `require-await` (async without await) | 4 | 1 | 1 to 2 |
| `no-base-to-string`, `restrict-template-expressions` | 3 | 1 | 1 to 2 |
| `unbound-method` | 1 | 6 | 6 |
| `no-redundant-type-constituents` | 2 | 7 | 7 |
| `no-unsafe-*` 5 rules total | 105 | 940 | 770 to 1,012 |

- The first 5 rules have almost no violations and can be turned on right away. The 1 to 16 violations can be fixed in one PR per app.
- Most of the thousands of `no-unsafe-*` hits came from test files (`*.test.tsx`). vitest and testing-library are not installed in the app checkouts on this PC, so their types resolved to `any`. The real numbers must be counted again in CI (where everything is installed). So this group is not turned on now.
- The 3 plugins (react-refresh, a11y, import sorting) and Tailwind sorting could not be counted because they are not installed yet. Import sorting and Tailwind sorting are fixed automatically by `--fix` and `prettier --write`, so only the number of files changed per app when first turned on is large.

## 3. Package verification (per dependency-policy.md)

| Package | Version | Release | Publisher | Repository | Install scripts | Sub-dependencies | Provenance | deps.dev advisories | Weekly downloads |
|---|---|---|---|---|---|---:|---|---|---:|
| `eslint-plugin-react-refresh` | 0.5.7 | 2026-09-14 | arnaud-barre | github.com/ArnaudBarre/eslint-plugin-react-refresh | None | 0 | Yes | None | 22.79 million |
| `eslint-plugin-jsx-a11y-x` | 0.2.0 | 2026-05-10 | 43081j | github.com/es-tooling/eslint-plugin-jsx-a11y-x | None | 7 | Yes | None | 240,000 |
| `eslint-plugin-simple-import-sort` | 14.0.0 | 2026-07-16 | lydell | github.com/lydell/eslint-plugin-simple-import-sort | None | 0 | No | None | 5.19 million |
| `prettier-plugin-tailwindcss` | 0.8.1 | 2026-07-15 | 4 people from tailwindlabs | github.com/tailwindlabs/prettier-plugin-tailwindcss | None | 0 | Yes | None | 8.8 million |

- All four versions are more than 14 days past release, and the publisher and repository match the official project.
- The 7 sub-dependencies of `eslint-plugin-jsx-a11y-x` use `^` ranges (`aria-query`, `axe-core`, `axobject-query`, `damerau-levenshtein`, `jsx-ast-utils-x`, `language-tags`, `minimatch`). The versions pinned in the lockfile will be checked in the install PR together with `ioc-scan`.
- The Socket (socket.dev) score cannot be viewed through the API without logging in, so I could not check it. The user checks it on the web before approval.
- The latest `typescript-eslint` is 8.72.1 (2026-10-26), but it is less than 14 days old, so 8.71.2 stays for now.

## 4. Recommendation

**ESLint (`@sirloinbh/eslint-config` 1.1.0)**

- Turn on 5 type-aware rules as `error`: `no-floating-promises`, `no-misused-promises`, `await-thenable`, `no-unnecessary-type-assertion`, `require-await`. `parserOptions.projectService: true` is required. Because type checking runs together, lint time increases. The real time will be measured in CI in #246.
- Turn on `react-refresh/only-export-components` as `warn` (Vite's recommended setting).
- Turn on `recommended` of `jsx-a11y-x` for frontend files.
- Turn on `simple-import-sort/imports` and `simple-import-sort/exports` as `error`.
- Add `reactRefresh`, `jsxA11y`, and `importSort` to the factory arguments. As now, the package imports nothing, and when an argument is missing, that rule is skipped so 1.0.0 apps do not break.

**Prettier (`@sirloinbh/prettier-config` 1.1.0)**

- `plugins: ["prettier-plugin-tailwindcss"]`, `tailwindStylesheet: "./frontend/src/index.css"` (Tailwind 4 needs the path of the CSS entry file. The path per app is checked in #246).

**Packages to install (approved in #245, root devDependencies of the 8 apps)**

```
eslint-plugin-react-refresh@0.5.7
eslint-plugin-jsx-a11y-x@0.2.0
eslint-plugin-simple-import-sort@14.0.0
prettier-plugin-tailwindcss@0.8.1
```

## Decisions

- On 2026-10-28 the user adopted the recommendations in section 4.
- Rules that need no install (the 5 type-aware rules, and from #243 the ban on default export and `type` only) and the plugin arguments go into the package in #308.
- Installing the 4 plugins is approved by the user in #245. For accessibility, the fork `eslint-plugin-jsx-a11y-x` is used instead of the original. The user checks Socket at approval time.
- Passing plugins in the app templates and the Prettier plugin are done in #246 (after #245).
- The 5 `no-unsafe-*` rules are on hold. They are counted again with CI values in #246.
