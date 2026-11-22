# #980 Stop the query template test from reading again after it ends

- Issue: [#980](https://github.com/sirloinbh/project-standards/issues/980)
- Branch: `test/980-query-test-no-late-read`
- Found in: sirloinbh/health-log#214

## Purpose

The `afterEach` in `templates/query/frontend/src/lib/query.test.tsx` called `vi.unstubAllGlobals()` and then `focusManager.setFocused(undefined)` while the hook of "stale data is refetched when the window gets focus again" was still mounted (the app's own `cleanup()` runs after the file's hook). The stale query read `/api/tags` again through the app's real or stand-in `fetch`. health-log fails a test on any unstubbed request, so it had to ignore `unmocked fetch: GET /api/tags` by name.

## Change — 2026-11-22

- The file's `afterEach` now unmounts the rendered hooks first (`cleanup()` from Testing Library; calling it twice is harmless, so the app's own cleanup still works).
- It then resets focus with a `fetch` stand-in that rejects, waits one timer turn, restores the globals, and fails the test if the stand-in was called. A query left mounted by any test in the file now fails that test here instead of leaking a request into the app's setup.
- Receivers (`features.query`): health-log and workout-memo, by the next sync. workout-memo's setup does not fake timers globally (its `fake-timers.ts` is opt-in), so the one-timer wait works there too.

## Verification

Run in health-log (Vitest 5.0.3, React Query 5), with this file copied over the managed copy and `knownStrayRequests` emptied in `frontend/src/test/setup.ts`:

- `vitest run src/lib/query.test.tsx`: 9 of 9 passed, with no stray request reported by health-log's strict setup.
- Mutation check 1: with `cleanup()` commented out, the new guard fails "stale data is refetched when the window gets focus again" (`expected "vi.fn()" to not be called at all, but actually been called 1 times`), and the leftover hook also breaks the next test.
- Mutation check 2: the old file (current `main`) with the allowance removed fails with `unmocked fetch: GET /api/tags`, which is the bug.
- Prettier check, ESLint (`--max-warnings 0`) on the file, and frontend `tsc --noEmit`: passed.
- `npm run check` here: passed (616 tests: 611 pass, 0 fail, 5 skipped; registry, docs, tokens, self, packages, workflows and secret checks passed).
