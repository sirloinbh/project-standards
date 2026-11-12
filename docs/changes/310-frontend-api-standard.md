# #310 Make the frontend API request function and health.ts centrally managed files

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/lib/api.ts`, `api.test.ts` | `requestJson`, `RequestError` (status code), `204` handling. 4 Vitest tests run together in the app |
| `templates/ui/frontend/src/health.ts` | `Health`, `healthText` (the same content as the files in 7 apps) |
| `registry/projects.json` | workout-memo `allowedDifferences`: `frontend/src/health.ts` |
| `templates/app/.prettierignore.tmpl` | The 3 new managed files |
| `scripts/test/frontend-api.test.mjs`, snapshot | Checks `api.ts` centrally with Node type stripping |
| `docs/ui-components.md` | "Shared helpers" section |

## Decisions

- The basis is study-log's `api.ts`. It is the only version that handles status codes and `204`. What changed:
  - Unrolled the constructor parameter property of `RequestError` (the `readonly status?` parameter) into a field. Node's type stripping does not support this syntax, and this is for the central test. Behavior is the same.
  - Set `name` to `RequestError`.
  - If the server body's `error` is not a string or is empty, it uses the fixed message "요청을 처리하지 못했습니다" (the request could not be processed).
- The location is the new path `frontend/src/lib/api.ts`. This is so the existing `frontend/src/api.ts` in study-log and plan-routine is not overwritten. For those two apps, change the imports in the app repo and delete the old file.
- 7 apps already have the same content at the same path (`frontend/src/health.ts`) for `health.ts`, so it was turned into a managed file in place. The only thing that changes in the apps is the managed file marker on the first line. workout-memo does not have this file and does not use it, so it was excluded with `allowedDifferences` (the "8 apps are the same" in the #240 research was actually 7).
- The fake `fetch` in the tests uses `Promise.resolve` and `Promise.reject` instead of `async`. So it is not caught even when `require-await` of shared ESLint 1.1.0 (#308) is turned on.

## After it reaches the apps (what to change in each app)

| App | What to change |
|---|---|
| study-log | Change `import { requestJson, RequestError } from './api'` to `'./lib/api'` and delete `frontend/src/api.ts` (same API) |
| plan-routine | Same as above. The old version had no `RequestError` and threw `Error`, so places that caught it with `instanceof Error` keep working |
| workout-memo | Replace `fetch` in 5 screen files (`analysis`, `app`, `backup`, `body`, `routines`) with `requestJson`. It needs screen behavior checks, so it proceeds separately |
| 5 skeletons | Use `requestJson` when feature screens are created |

## Checks

- `node --test scripts/test/frontend-api.test.mjs`: 2 passed
- Ran `api.test.ts` with Vitest 5.0.3 installed in workout-memo (temporary folder, no install): 4 passed
- Checked the three files with the shared config 1.1.0 applied through ESLint installed in workout-memo: no violations. Formatted with the shared Prettier config
- `npm run sync:preview`: the 8 apps receive `lib/api.ts` and `api.test.ts`, and the 7 apps other than workout-memo receive `health.ts`
- The result of `npm run check` is written in the PR
