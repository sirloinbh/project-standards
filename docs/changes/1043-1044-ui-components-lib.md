# #1043, #1044 Bring the shared helper docs up to date

- Issues: [#1043](https://github.com/sirloinbh/project-standards/issues/1043), [#1044](https://github.com/sirloinbh/project-standards/issues/1044)
- Branch: `docs/1043-1044-ui-components-lib`
- Related: ADR-0027, #669, #674, #682, #788, #1008

## Changes — 2026-11-23

`docs/ui-components.md`, "Shared helpers":

- New `lib/query.ts` row (#1043): the five exports, the shared defaults, and what `useApiMutation` does with its `invalidate` keys (cancel running reads, refetch, stay pending). The rule under the table now says a screen loads with `useApiQuery` and saves with `useApiMutation`, and calls `requestJson` itself only for a one-off call.
- `lib/api.ts` row (#1044): `requestForm`, `onUnauthorized`, `RequestError.kind` and `fields`, the 30 s timeout and the `signal` option.
- New `session-watch.ts` / `sign-in.tsx` row: the 401 redirect and the loop guard.
- `health.ts` row: `useHealth`.

Documentation only: no template or sync change.

## Verification

- `npm run check:docs`: passes. Each described behavior was read from the source (`query.ts`, `api.ts`, `session-watch.ts`, `health.ts`).
