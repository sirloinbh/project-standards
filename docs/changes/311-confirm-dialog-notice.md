# #311 Shared components for the delete confirmation dialog and in-screen notices

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/components/ui/confirm-dialog.tsx`, `.test.tsx` | `ConfirmDialog`: title, description, confirm, and cancel on top of the shared `Dialog`. 5 tests |
| `templates/ui/frontend/src/components/ui/notice.tsx`, `.test.tsx` | `Notice`: `role="status"` and `"alert"`. 3 tests (including the hook) |
| `templates/ui/frontend/src/lib/use-notice.ts` | `useNotice()`, `errorText()`, `NoticeValue` |
| `templates/app/.prettierignore.tmpl`, snapshot | New managed files |
| `docs/ui-components.md`, `docs/design.md` | List, shared helpers, file classification |

## Decisions

- `ConfirmDialog`
  - It opens in two ways: `trigger` (one dialog per button), or `open` and `onOpenChange` (when deleting one row chosen from a list).
  - If `onConfirm` returns a Promise, both buttons are disabled until it finishes and the confirm button shows a `Spinner`. On success it closes, and on failure it stays open. The screen shows the failure message with `useNotice`.
  - While processing, it cannot be closed with Esc or by clicking outside.
  - The close button at the top right was left out. "Cancel" does the same job.
- `Notice` and `useNotice`
  - The hook was split into `lib/use-notice.ts`. A component file must export only components for Vite fast refresh to work (#244 `react-refresh` rule).
  - It uses study-log's `{ kind: 'status' | 'error', text }` shape as it is. An error is read out immediately with `role="alert"`, and progress and success are read in turn with `role="status"`.
  - `error(e)` accepts the thrown value as it is. For a `RequestError` (#310), the server's Korean message is shown (the server messages were Korean at the time).
- Replacing raw `<button>` and `<input>` with shared components (#242 candidate H) was not done.
- The template renderer reads two curly braces as a variable, so JSX object values in tests were pulled out into variables (`notice={saved}`).

## After it reaches the apps

| App | What to change |
|---|---|
| workout-memo | Replace the 3 `confirm()` calls (2 in `app.tsx`, 1 in `body.tsx`) with `ConfirmDialog` |
| study-log | Replace the `Notice` type and the `role="status"` and `role="alert"` paragraphs in each screen (10 screens) with `useNotice` and `<Notice>`. Decide after looking at the screens whether to replace the press-twice delete buttons with `ConfirmDialog` |

## Checks

- Ran `notice.test.tsx` and `api.test.ts` with Vitest 5.0.3, jsdom, and Testing Library installed in workout-memo (temporary folder, no install): 7 passed
- Type-checked `notice.tsx`, `use-notice.ts`, and the tests with `strict`, using TypeScript 5.9.3 in the same app: no errors
- Checked the 5 new files with the shared config 1.1.0 applied through the same app's ESLint: no violations
- I could not run `confirm-dialog.tsx` and its test because `radix-ui` is not installed in this PC's app checkout. They run for the first time in the app CI of the sync PR (starting with rollout 1 workout-memo). The tests were written the same way as the existing `dialog.test.tsx` (`fireEvent`, finding by role and name).
- The result of `npm run check` is written in the PR
