# #616 Run the scaffold backend tests in CI

## Change

| File | Content |
|---|---|
| `.github/workflows/ci.yml` | New job `scaffold-tests`: renders study-log's scaffold, runs `npm install`, then `npm run test -w backend` |

## Notes

- The job reads the `@sirloinbh` packages with the job token (`packages: read`, `NODE_AUTH_TOKEN`), like the reusable app CI. The existing `check` job still needs no dependencies.
- The scaffold has no lockfile yet, so the job uses `npm install`. The rendered `.npmrc` keeps install scripts off. Agents do not run this; only CI does.
- `fetch-depth: 0` is needed because `scripts/scaffold.mjs` looks up the last commit that changed the reusable workflows.
- Run once by hand on 2026-11-17: 18 backend tests passed.

## Verification

- `npm run check` and the new job in the PR's CI.
