# Changelog

## 1.1.0

- All files: `@typescript-eslint/consistent-type-definitions: type`, and default exports are forbidden (`no-restricted-syntax`). Tool config files (`*.config.*`) use a default export (#243). The 8 apps have 0 violations.
- When the option `tsconfigRootDir` is passed, 5 type-aware rules are turned on for `frontend/src` and `backend/src` (option `typedFiles`): `no-floating-promises`, `no-misused-promises`, `await-thenable`, `no-unnecessary-type-assertion`, and `require-await` (#244). If it is not passed, they stay off.
- Accepts the optional plugin arguments `reactRefresh` (eslint-plugin-react-refresh, Vite config), `jsxA11y` (eslint-plugin-jsx-a11y-x recommended), and `importSort` (eslint-plugin-simple-import-sort). Rules for plugins that are not passed are not added, so apps that have not installed them yet keep working as before (#308).

## 1.0.0

- First version. Provides the same rules as the 8 apps' existing `eslint.config.mjs` as a factory (`createConfig`) (#65).
