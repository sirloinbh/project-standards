# #981 Make the query template's abort test independent of timing

- Issue: [#981](https://github.com/sirloinbh/project-standards/issues/981)
- Branch: `test/981-query-abort-timing`
- Downstream issue: sirloinbh/health-log#268

## Purpose

"useApiQuery loads the path, and leaving the screen aborts the request" in `templates/query/frontend/src/lib/query.test.tsx` failed once in health-log's full `npm run check` on a loaded PC (`expected false to be true` at `expect(signal?.aborted).toBe(true)`), then passed on rerun. The fetch stub answered every request after a fixed 20 ms. When `/api/slow` was answered before `pending.unmount()`, there was nothing left to abort.

## Change — 2026-11-22

- The stub answers `/api/goals` at once. `/api/slow` never answers on its own: it rejects with an `AbortError` only when its signal aborts, so it is still in flight at the unmount. Only `/api/slow`'s signal is kept, so the abort assertion is about that request alone.
- The assertions are unchanged: `/api/goals` loads and gets an `AbortSignal`, and unmounting the `/api/slow` screen aborts it.
- Receivers (`features.query`): health-log and workout-memo, by the next sync.

User decision 2026-11-22 (relayed by the health-log coordinator, recorded on sirloinbh/health-log#268): fix the template here, merge it, then review and merge the health-log sync PR.

## Verification

Run in health-log (Vitest 4, React Query 5.104.1), with this file copied over the managed copy and restored afterwards:

- Prettier check and ESLint (`--max-warnings 0`) on the file: passed. Frontend `tsc --noEmit`: passed.
- `vitest run src/lib/query.test.tsx` 10 times alone: 9 of 9 passed each time. Another 10 times in parallel with two full frontend runs under load: 9 of 9 each time. The two full runs: 778 passed, 3 skipped each.
- Mutation check: with `useApiQuery`'s `queryFn` changed to drop the signal, the test fails ("leaving the screen aborts the request", 1 failed, 8 passed).
- `npm run check` here: passed (616 tests: 611 pass, 0 fail, 5 skipped; registry, docs, tokens, self, packages, workflows and secret checks passed).
