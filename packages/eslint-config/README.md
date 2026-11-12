# @sirloinbh/eslint-config

The shared ESLint config for sirloinbh apps. The package imports nothing; it takes the plugins the app installed as arguments.

```js
// eslint.config.mjs (centrally managed file)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import { createConfig } from '@sirloinbh/eslint-config';

export default createConfig({ js, tseslint, globals, reactHooks, prettier }, { tsconfigRootDir: import.meta.dirname });
```

- Options
  - `ignores`: extra paths to exclude
  - `frontendFiles`: paths where the React rules apply (default `frontend/src/**/*.{ts,tsx}`)
  - `tsconfigRootDir`: when passed, turns on 5 type-aware rules (1.1.0). Pass `import.meta.dirname` from `eslint.config.mjs`
  - `typedFiles`: paths where the type-aware rules apply (default `frontend/src/**/*.{ts,tsx}`, `backend/src/**/*.ts`)
- Optional plugins (1.1.0): if the app installs one and passes it, its rules are turned on. If it is not passed, it is skipped.

  | Argument | Package | Rules turned on |
  |---|---|---|
  | `reactRefresh` | `eslint-plugin-react-refresh` (`import { reactRefresh } from ...`) | `configs.vite()` (`frontendFiles`) |
  | `jsxA11y` | `eslint-plugin-jsx-a11y-x` | `configs.recommended` (`frontendFiles`) |
  | `importSort` | `eslint-plugin-simple-import-sort` | `simple-import-sort/imports`, `exports` |

- In every file, only `type` is allowed (no `interface`) and default exports are forbidden. Tool config files (`*.config.*`) use a default export.
- The versions in peerDependencies are pinned exactly. The app's `devDependencies` must use the same versions.
