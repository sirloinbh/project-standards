# #1110 Add push and notificationclick handlers to the shared service worker

## Why

plan-routine (#249, Web Push evening reminder) needs a service worker that shows a push message and opens the app on click. `frontend/public/sw.js` is fully managed, so the change is made here.

## Change

| File | Content |
|---|---|
| `templates/app/frontend/public/sw.js` | `push` handler (JSON payload `{ title, body, url }`, safe on a missing or broken payload) and `notificationclick` handler (focus a window already on the URL, else open it; same origin only, else `/`) |
| `docs/pwa.md` | Section "Web Push handlers" |
| `scripts/test/pwa.test.mjs` | Runs the rendered worker in a sandbox and checks both handlers, the fallback title, the same-origin rule and focus versus open |

Apps without a push subscription are not affected. The sync snapshot lists file names only, so it does not change.

## Verification

See the PR.
