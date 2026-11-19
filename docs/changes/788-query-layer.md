# #788 Ship a shared query layer on @tanstack/react-query

ADR-0027 picks `@tanstack/react-query` for all 8 apps. This adds the shared layer on top of `requestJson`.

## Change

| File | Content |
|---|---|
| `templates/query/frontend/src/lib/query.ts` | `createQueryClient()` (30 s fresh time, retry once for network, timeout and 5xx failures only, refetch on window focus, mutations never retried), `useApiQuery(key, path)` (passes the query's abort signal to `requestJson`), `useApiMutation(request, { invalidate })` (refetches the invalidated keys before the mutation ends), `apiKey(path, ...parts)` and `shouldRetry` |
| `templates/query/frontend/src/lib/query.test.tsx` | 9 tests: retry rules, the defaults and overrides, key helper, abort on unmount, 4xx not retried and 5xx retried once, fresh cache without a request, refetch on focus, invalidation, a failed mutation |
| `registry/projects.schema.json`, `registry/projects.json` | New feature `query` (true for workout-memo, false for the other 7) |
| `sync.config.json` | `featureTemplates.query` maps to `templates/query` |
| `versions.json` | `optionalDependencies.frontend.dependencies`: `@tanstack/react-query` 5.104.1, pinned only in apps that already list it |
| `templates/app/.prettierignore.tmpl` | The two new managed files |
| `docs/projects.md`, `docs/versions.md` | Regenerated |
| `scripts/test/scaffold.test.mjs`, `templates.test.mjs` | The sample project has `query: false`; the Prettier-ignore test also renders the `query` folder |
| `templates/ui/frontend/src/lib/api.test.ts` | Fixed a test helper from #682: the fake `fetch` did not reject when it was given an already aborted signal, as a real fetch does, so "aborting the caller's signal rejects with kind abort" timed out in an app's Vitest run. It was never run under Vitest before (the central check does not run it) |

## Why a feature gate (a change from the issue text)

`lib/query.ts` imports `@tanstack/react-query`, which only workout-memo has installed. In `templates/ui` it would break typecheck and lint in the other 7 apps, and adding the package to every app would make knip report it as unused (ADR-0027, decision 3). So it ships as the `query` feature, like `msw`. An app turns it on with one line in `registry/projects.json` in its adoption PR, after it installs the package. The scaffold keeps `new QueryClient()` (a template cannot be conditional); a new app that adopts the shared layer switches the feature on and calls `createQueryClient()`.

## Checked in real app clones (LANES.md rule 11)

The files `sync:preview` writes were copied into clean clones, checked, and restored with `git checkout` (nothing committed):

- workout-memo (feature on): `eslint frontend/src/lib --max-warnings 0` clean, `tsc --noEmit` clean, `vitest run src/lib` 25 passed (3 skipped: the theme tests for a light app). This run found the `api.test.ts` bug above.
- study-log (feature off): the preview has no `query.ts`; lint and typecheck clean, `api.test.ts` 12 passed.

## Follow-up

Adoption issues (each blocked by this one): workout-memo#394, plan-routine#178, health-log#220, money-ledger#213, cert-manager#161, dev-career-portfolio#152, study-log#287, life-journal#158. Each should also set `features.query` to true in the central registry in the same step as installing the package.
