# #783 (part) Frontend zod only for apps with a contract

Part of #783. The managed frontend `zod` dependency no longer forces every app to list it: apps with `features.contract` off need no `zod` in `frontend/`.

## Change

| File | Content |
|---|---|
| `versions.json` | Frontend `zod` 4.6.7 moves from `dependencies` to `optionalDependencies` (applied only where the app's `frontend/package.json` already lists it). The backend `zod` is unchanged |
| `docs/versions.md`, `docs/dependency-policy.md` | Regenerated / row added |
| `scripts/test/templates.test.mjs` | New test: written only where listed, nothing for an app without it |

## Why this shape

The optional section already exists (#704) and means "pin the version, never add the package", which is exactly what an app without a contract needs. An app with a contract keeps `zod` because its frontend `contract.ts` copy imports it, and the sync still pins its version. `check.mjs` verifies only the fields that the manifest records, so it does not ask an app without `zod` for one.

## Checks

- `npm run check`: see the PR.
