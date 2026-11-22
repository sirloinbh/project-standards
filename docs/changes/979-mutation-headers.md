# #979 Let useApiMutation pass request headers

- Issue: [#979](https://github.com/sirloinbh/project-standards/issues/979)
- Branch: `feat/979-mutation-headers`
- Parent: #788

## Purpose

health-log's meal add sends an `Idempotency-Key` header (sirloinbh/health-log#196) so a retried add is not recorded twice. `ApiRequest` had no `headers`, so health-log had to call `useMutation` directly with its own `mutationFn` (sirloinbh/health-log#220).

## Change — 2026-11-22

- `templates/query/frontend/src/lib/query.ts`: `ApiRequest` gets an optional `headers?: Record<string, string>`, and `useApiMutation` passes it to `requestJson`, which already merges it with the JSON `content-type`.
- `templates/query/frontend/src/lib/query.test.tsx`: new test "a mutation sends the request headers it is given, next to the JSON content type".
- Backward compatible: the field is optional and a request without it sends what it sent before (`headers: undefined` is what `requestJson` got when nothing was passed). Receivers (`features.query`): health-log and workout-memo. workout-memo does not call `useApiMutation` today (its `ApiRequest` in `frontend/src/test/api.ts` is a different, test-only type), so nothing there changes.

## Verification

Run in health-log (Vitest 5.0.3), with both files copied over the managed copies and restored afterwards:

- `vitest run src/lib/query.test.tsx`: 10 of 10 passed.
- Mutation check: with the old `query.ts` (headers not passed), the new test fails (1 failed, 9 passed).
- Prettier check, ESLint (`--max-warnings 0`) on both files, and frontend `tsc --noEmit`: passed.
- `npm run check` here: passed (616 tests: 611 pass, 0 fail, 5 skipped; registry, docs, tokens, self, packages, workflows and secret checks passed).
