# #30 API rules and backend base structure

## Change

| File | Content |
|---|---|
| `docs/directory-rules.md` "API" | Structure (`createApp` assembly order, `routes/<feature>.ts`), paths, `GET /api/health`, the `{ error }` error response and a status code table, where validation happens, the list of check warnings, and a comparison table with workout-memo and the other 7 apps. In the "OpenAPI" section, the `operations` and `.prettierignore` rules |
| `scripts/standards-check.mjs` | `checkApi()`: in repos that have `backend/src/app.ts`, reports 6 API rule violations as warnings. It does not fail (exit code 1) |
| `scaffold/app/backend/src/` | `app.ts` gets `app.use('/api', notFound)`. `routes/shared.ts` gets `notFound` and handling of malformed JSON (400), body size (413), and 4xx errors before routing. `openapi.ts` (Zod to JSON Schema, cross-check of routes against `operations`), `openapi-cli.ts` |
| `scaffold/app/backend/test/` | `health.test.ts` gets tests for a 404 on an unknown `/api` path and a 400 on malformed JSON. `openapi.test.ts` (whether the generated file is current, path format, rejecting undocumented routes) |
| `scaffold/app/shared/contract.ts` | Error response type `ApiError` |
| `scaffold/app/docs/openapi.json.tmpl`, `.prettierignore.tmpl` | The initially generated OpenAPI document, and the project section that excludes it from prettier |
| `scaffold/app/package.json.tmpl`, `backend/package.json.tmpl`, `README.md` | `npm run openapi` |
| `scripts/test/standards-check.test.mjs` | 4 warning fixture tests: the scaffold backend gives 0 warnings; violations give warnings with 8 line numbers; the study-log style (anonymous error handler, `Router` wiring) passes; `runCheck` gives warnings only, without failure |
| `scripts/test/scaffold.test.mjs` | 1 rendering test: `app.ts`, `routes/`, `contract.ts`, the OpenAPI file, `docs/openapi.json` matches the `operations` and title in `openapi.ts` and the `JSON.stringify` format, and the `.prettierignore` project section |

## Decisions

- Warnings look at the rule, not the file location, because apps place routes differently (workout-memo `routes/`, study-log `Router`). Test files (`*.test.ts`) are not read.
- The check code stays inside `standards-check.mjs`, so the list of files copied to downstream repos (`vendor` in `templates/index.json`) does not grow.
- The scaffold has no example feature route. This avoids creating code that a new project has to delete, and touches fewer of the same files as #27 (migration runner).
- OpenAPI summaries are written directly in `operations`, not read from `docs/api.md` as workout-memo does. This removes one document file and one parser.

## User decisions (2026-10-22)

- Success body of `/api/health`: the scaffold uses `{ status: 'ok' }`, and the existing apps' `{ ok, service, today }` is also allowed. The health check tool only looks at the status code.
- Scaffold 500 message: changed to the same one as the 7 apps, "서버 오류가 발생했습니다" (a server error occurred) (workout-memo uses "저장소에 연결할 수 없습니다…", cannot connect to the storage…).
- Scaffold TypeScript verification (`tsc`, `prettier --check`, backend tests, `npm run openapi`) is done when the first new project is installed. It is not run with workout-memo's `node_modules`.

## Checks

- `npm run check` passed: after merging origin/main (up to #174), 186 of 187 tests passed with 0 failures (1 pre-existing skip), `registry-check: ok`, `docs/projects.md` and `design-tokens.md` up to date, `package-guard: ok`, `check-workflows: ok`.
- I ran `checkApi()` on `backend/src` of the 8 local apps: workout-memo gets 1 warning ("404 for unknown /api path"), and the other 7 get 0 warnings.
- Not run: `tsc`, `prettier --check`, backend tests, and `npm run openapi` on the rendered scaffold. Per the user decision above, they will be verified when the first new project is installed. For that reason I wrote the value that `buildOpenApi()` produces directly into `docs/openapi.json`, and the rendering test checks that it matches the `operations`, title, and `JSON.stringify` format. After the first install, `openapi.test.ts` in `npm run check` is the final check.
