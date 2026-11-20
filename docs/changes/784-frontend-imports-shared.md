# #784 (central part) The frontend imports shared/contract.ts directly

After #770 the Docker builds use the repo root, so the frontend can import `shared/contract.ts` without a copy. The backend keeps its copy (decision of the coordinator, 2026-11-20).

## Change

| File | Content |
|---|---|
| `templates/app/scripts/contract.mjs`, `.../test/contract.test.mjs` | The copy list is `backend/src/contract.ts` only |
| `templates/app/frontend/tsconfig.json.tmpl` | `include` gains `../shared` so lint and typecheck cover `shared/contract.ts` |
| `scripts/scaffold.mjs`, `scaffold/app/*`, `registry/projects.schema.json`, `docs/directory-rules.md` | One copy instead of two; the frontend imports the source |

## Why the backend keeps a copy

The backend builds with plain `tsc` (`outDir dist`, root `src`). An import from `../../shared` moves the common root to the repo root, so output becomes `dist/backend/src/server.js`; the start command, the Dockerfile `CMD`, the migrations path (#839) and `remote-deploy.sh` would all change.

## Follow-up idea

Option B: set the backend `rootDir` to the repo root and update the start command, Dockerfile, migrations path and deploy script together. Worth doing only if the one remaining copy causes drift; the copy is checked by `contract:check`, so it cannot silently differ.

## Checks

- `npm run check`: see the PR.
