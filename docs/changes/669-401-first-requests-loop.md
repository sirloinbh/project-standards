# #669 Catch 401s from first requests and stop sign-in redirect loops

## Change

- `templates/ui/frontend/src/lib/api.ts`: new `onUnauthorized(handler)`. `requestJson` and `requestForm` call it when a request answers 401, then reject with the same `RequestError` as before. It returns a function that removes the handler (and leaves a newer handler alone). The change is additive.
- `templates/ui/frontend/src/session-watch.ts`: `watchSession()` (which replaced `window.fetch`, #596) is gone. `createUnauthorizedHandler()` redirects to sign-in on the first 401 only, and refuses a second redirect within 60 seconds (`onLoop`), kept in `sessionStorage`. `clearRedirectMark()` and `browserStorage()` handle the retry button and blocked storage.
- `templates/ui/frontend/src/sign-in.tsx`: the gate registers the handler in a layout effect. Layout effects run before every child's first effect, so the first requests a page sends on mount are watched (before, the gate's later `useEffect` missed them). After a detected loop the gate shows "Signing in did not finish." with a retry button that clears the mark and reloads. No cleanup restores a stale `fetch` any more.
- Tests: Vitest cases in `api.test.ts` and `session-watch.test.ts`, the same cases in `scripts/test/frontend-api.test.mjs` and `frontend-session-watch.test.mjs`, plus a check that no managed frontend file assigns `window.fetch`.

## Caveat: direct `fetch` calls

#596 watched `window.fetch` so apps that call `fetch` directly (workout-memo in several screens; study-log and plan-routine have their own wrappers) were covered with no app change. Now only `requestJson`/`requestForm` report 401. An app that calls `fetch` directly keeps working but must move that call to `requestJson` (or call the handler itself) to be sent to sign-in on a 401. The issue asked for this trade-off.

## Why a time window

Without a counter, "signed in but the API answers 401" makes the app and sign-in redirect each other forever. A mark with a time (60 s) allows a later real session expiry (hours after) to redirect normally, while a loop (seconds per round) is stopped after one extra round trip.

## Verification

- `node --test` on the two central test files: 12 pass.
- Vitest was not run here (no app dependencies in this repo); the Vitest files mirror the Node cases.
