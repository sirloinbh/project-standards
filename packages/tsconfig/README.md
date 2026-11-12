# @sirloinbh/tsconfig

The shared TypeScript config for sirloinbh apps.

| File | Used by |
|---|---|
| `base.json` | Common: ES2022, strict, skipLibCheck |
| `react-app.json` | `frontend/tsconfig.json` (Vite + React, no build output) |
| `node-api.json` | `backend/tsconfig.json` (Node ESM, built to `dist/`) |

```json
// frontend/tsconfig.json (centrally managed file)
{ "extends": "@sirloinbh/tsconfig/react-app.json", "include": ["src", "vite.config.ts"] }
```

- `include` is not inherited, so put it in the app's entry file.
- `outDir` in `node-api.json` is `${configDir}/dist`. It is relative to the folder of the tsconfig that inherits it, so it builds to `backend/dist` (TypeScript 5.5 or later).
