# #971 Remove the 20 ms sleeps from the AI shell test

The managed test `components/layout/ai-shell.test.tsx` waited twice with a real 20 ms sleep in "a turn cancelled by New conversation does not end the busy state of the next turn". On a loaded machine 20 ms may not be enough, and the test only passed by timing. workout-memo found it in its test determinism card (sirloinbh/workout-memo#380) and could not change the managed file.

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/components/layout/ai-shell.test.tsx` | The two `setTimeout(resolve, 20)` sleeps are replaced by `settlePromises()`: `act()` around one zero-delay task. The cancelled request now rejects with an `AbortError` the moment it is aborted (`pendingUntilAborted`, like a real `fetch` aborted before the answer), instead of a `Response` stream that errors on abort. Before the third message is sent, the test types it and checks that Send is `aria-disabled`, so it asserts the busy state directly and not only the fetch count |

## What was decided

- **What the test waits for.** Nothing on screen shows when the cancelled turn has finished: with the fix in `use-ai-chat.ts` it changes nothing. So there is no condition for `waitFor` to poll. The cancelled turn settles through promise callbacks only (the rejected fetch, the `catch` in `streamChat`, then `catch` and `finally` in `send`), and a zero-delay task runs only after every queued promise callback. That makes the wait an ordering guarantee, not a timing guess.
- **Why the request rejects instead of streaming.** With the earlier `Response` stream, the abort travels through the stream implementation; one zero-delay task was not proven to be enough there. A rejected promise is a short chain of promise callbacks. The hook code under test is the same either way: both paths end in the `finally` that must not clear the next turn's busy state.
- **Why the extra `aria-disabled` check.** After `ask()` the draft is empty, so Send is `aria-disabled` no matter what. Typing `third` first makes the attribute depend on `busy` only. This is the first line that fails when the guard `if (abort.current === controller)` is removed.
- Fake timers were not used: the hook has no timers, and the other tests in the file use `findBy`/`waitFor`, which need real ones.

## Checks

In a study-log clone (managed files copied in, restored afterwards):

- `npm run test -w frontend -- src/components/layout/ai-shell.test.tsx`: 13 passed, 5 runs in a row.
- Mutation check: with `if (abort.current === controller) setBusy(false)` changed to `setBusy(false)` in `use-ai-chat.ts`, the test fails at the `aria-disabled` check.
- `eslint` on the file: no errors. `npm run typecheck -w frontend`: no errors. Prettier `--check`: formatted.
- `npm run check` in this repo: see the PR.
