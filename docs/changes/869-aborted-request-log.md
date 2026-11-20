# #869 requestLog does not log an aborted request as a 200

## Change

| File | Content |
|---|---|
| `templates/app/backend/src/standard/http.ts` | At `close`, a response that is not `writableFinished` is logged as `status: 499`, `aborted: true`, level `warn`. A finished request is logged as before (no `aborted` field) |
| `scripts/test/backend-http.test.mjs` | The fake response gets `writableFinished: true`; a unit test for the aborted line; a test on a real Node server where the client hangs up before the handler answers |

## Why

`res.statusCode` is still 200 when nothing was written, so a request that a client or proxy abandoned showed up as a success at `info` level.

## Checks

- Rule 11: the changed file was copied into a clean workout-memo clone; eslint, `tsc -p tsconfig.check.json` and prettier pass; the clone was restored.
- `npm run check`: see the PR.
