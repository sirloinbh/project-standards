# #596 Back to sign-in when the session ends during use

## Change

- New managed `templates/ui/frontend/src/session-watch.ts`: `watchSession()` wraps `fetch` so the first 401 from the app's own `/api/` calls a sign-out handler once, and still returns the response to the caller. Other statuses, paths and origins are untouched.
- `templates/ui/frontend/src/sign-in.tsx`: once the session check says signed in, the gate replaces `window.fetch` with the watched one, whose handler sends the visitor to `auth.<domain>/sign-in` and back; it restores the original on unmount. Without an auth origin (localhost, IP addresses) nothing changes.
- `templates/app/.prettierignore.tmpl`: the two new managed files.

## Reason

- The gate checks `/api/me` only when the page loads. A session that ends later (expired, signed out in another tab) left every request failing with an error message until a reload.
- The issue planned the fix in `lib/api.ts`, but not every call goes through `requestJson`: workout-memo calls `fetch` directly in several screens, and study-log and plan-routine have their own wrappers. Watching `fetch` covers all of them with no per-app change.
- Child components' first effects run before the gate's effect, so requests made on the very first render after the check are not watched; the session was confirmed a moment earlier, so a 401 there is unlikely, and the next request is watched.

## Verification

- `npm run check`: 599 tests, 594 pass, 0 fail, 5 skipped; `scripts/test/frontend-session-watch.test.mjs` runs the same cases as the app-side Vitest file.
- In a temporary workout-memo worktree with the new files: Prettier, ESLint and `tsc --noEmit` pass; Vitest `session-watch` (2) and the app's `sign-in` tests (2) pass.
- `UPDATE_SNAPSHOT=1 npm test`: the snapshot adds the two files for all 8 apps.
