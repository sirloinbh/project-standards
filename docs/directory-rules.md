# Directory and routing rules

This standard is based on the workout-memo structure. New projects follow it as is, and `standards-check` reports existing repos as warnings (not failures).

## Standard tree

```
<project>/
├─ AGENTS.md  AGENTS.project.md  CLAUDE.md  README.md
├─ package.json  package-lock.json          # npm workspaces: frontend, backend
├─ compose.yaml  .env.example
├─ shared/contract.ts                       # source of input schemas (Zod)
├─ frontend/                                # subtree → <project>-frontend
│  ├─ Dockerfile  nginx.conf  package.json  package-lock.json  vite.config.ts
│  └─ src/
│     ├─ main.tsx  app.tsx                  # entry point, layout and router
│     ├─ <feature>.tsx                      # one file per screen
│     ├─ components/ui/                     # shadcn/ui shared components (centrally managed, #123)
│     ├─ lib/                               # utilities such as cn()
│     ├─ contract.ts                        # copy of shared/contract.ts (do not edit directly)
│     └─ test/                              # test helpers
├─ backend/                                 # subtree → <project>-backend
│  ├─ Dockerfile  package.json  package-lock.json  tsconfig.json
│  ├─ src/
│  │  ├─ server.ts  app.ts                  # server start, app assembly and error handling
│  │  ├─ routes/<feature>.ts  routes/shared.ts # per-feature API modules, re-export of shared helpers
│  │  ├─ standard/http.ts                   # centrally managed: error handler, 404, ID and date helpers (#309)
│  │  ├─ openapi.ts  openapi-cli.ts         # OpenAPI document generation (docs/openapi.json)
│  │  ├─ domain.ts                          # domain rules and validation
│  │  ├─ migrations.ts  migrate.ts          # migration runner rules and command (docs/conventions/database.md)
│  │  └─ contract.ts                        # copy of shared/contract.ts
│  └─ test/
├─ database/                                # subtree → <project>-db
│  ├─ README.md
│  └─ migrations/NNN_<description>.sql
├─ e2e/                                     # Playwright (for projects that use e2e)
├─ scripts/                                 # PowerShell and Node scripts (some centrally managed)
├─ skills/  .claude/skills/                 # std-* (centrally managed) + project-specific skills
└─ docs/  changes/  daily/  next-steps/
```

Basis: workout-memo `frontend/src`, `backend/src/routes/`, `shared/contract.ts`, `database/migrations/`

## Screen URLs (React Router)

- The router uses `BrowserRouter`, and menu links are built with `NavLink`.
- Page paths are collected in one place (the `pages` object in `app.tsx`). Basis: workout-memo `frontend/src/app.tsx`, `pages = { overview: '/', journal: '/journal', … }`.
- Paths are lowercase English, with words joined by hyphens: `/body-measurements`. The first screen (overview) is `/`.
- Shareable screen state such as list filters and date ranges goes in the query string (`useSearchParams`): `/journal?from=2026-10-01&to=2026-10-22`.
- If a detail screen is needed, use the form `/<list>/:id`.

## API (Express)

All 8 apps use Express 5 + Zod. Production code is not distributed as a package; new projects start from the same structure with the scaffold (`scaffold/app/backend`). For existing apps, `standards-check` reports the rules below as warnings (not failures).

### Structure

- `createApp(pool)` in `backend/src/app.ts` assembles the app, in this order: JSON body parser → feature routes → `app.use('/api', notFound)` → `app.use(errorHandler)`. `server.ts` only opens the port.
- Each feature has one `backend/src/routes/<feature>.ts` module, registered by a `register<Feature>Routes(app, pool)` function.
- The error handler (`errorHandler`), the 404 for unknown routes (`notFound`), `HttpError`, `parseId`, and `serviceDate` live in the centrally managed file `backend/src/standard/http.ts` (#309). All 8 apps receive the same file through sync, so do not edit it in an app. The scaffold re-exports these along with the `Db` type from `routes/shared.ts`.
- This file only imports types. That lets it work regardless of the app's zod and Express versions (`ZodError` is recognized by its shape).
- Tests pass a fake `pool` to `createApp` to check routing and error format without a DB (scaffold `backend/test/health.test.ts`).

### Paths

- Every API path starts with `/api`. nginx forwards `/api/` to the API container.
- Paths use lowercase English plurals and hyphens: `GET /api/body-measurements`, `DELETE /api/workouts/:id`. File extensions are added only for downloads: `GET /api/export/workouts.csv`.
- Updates default to `PUT` (full replacement). Paths that change only some fields (such as renaming) use `PATCH`.
- Actions that cannot be expressed as create, change, or delete are written as `POST /api/<resource>/:id/<action>`: `POST /api/routines/:id/archive`, `POST /api/routines/:id/move`.
- Successful creation is `201`, and successful reads and updates are `200`. Successful deletion is `200` or `204` (no body) (#312). The screen's `requestJson` (`frontend/src/lib/api.ts`) returns `undefined` for `204`.

### Success response shape

- New code wraps the payload in a name: a list is `{ "<plural>": [...] }` (`{ "textbooks": [...] }`), and a single item is `{ "<singular>": {...} }` (`{ "textbook": {...} }`) (#312). Adding fields later (totals, next page, and so on) does not break the response shape.
- The existing workout-memo sends rows and arrays as they are (`res.json(rows)`). It stays that way because the screens would have to change at the same time.
- There is no rule for list pagination. For the data size of a single-user app, a date range filter is enough (#241 candidate G).

### Health check `GET /api/health`

- Every app must have it. It checks the DB connection too with `SELECT 1`.
- If the DB responds, it returns `200`; otherwise it goes through the error handler and returns `500 { error }`. Health check tools (Docker healthcheck, deploy verification) look only at the status code.
- The success body is `{ "status": "ok" }` per the scaffold. The existing apps' `{ ok, service, today }` is also allowed (see the differences table below).

### Error responses

- Every error response body is a single `{ "error": "<English message>" }`. Its type is `ApiError` in `shared/contract.ts`. The screen must be able to show `error` as is.
- Internal messages (SQL, stack) are not put in the response; they are only logged with `console.error(JSON.stringify({ event: 'request_error', message }))`.

| Status code | When | Handled in |
|---|---|---|
| `400` | Zod validation failure (the first 10 issue messages joined with `, `, and only the count for the rest), malformed JSON body, invalid ID (`parseId`), `NUL` character input (PostgreSQL `22021`) | `errorHandler` |
| `404` | The target row does not exist (`throw new HttpError(404, '…')`) / an unregistered `/api` path | route / `notFound` |
| `409` | Unique constraint violation (PostgreSQL `23505`), state conflict | `errorHandler` / route |
| `413` | Body size limit exceeded (default `256kb`) | `errorHandler` |
| Other `4xx` | A client error raised by Express before routing | `errorHandler` (status code kept) |
| `500` | Every other error (including DB connection failure) | `errorHandler` |

- A route raises the status code and message it wants with `throw new HttpError(<status code>, '<English message>')`. `errorHandler` sends it as is.
- For errors that exist only in an app (such as workout-memo's foreign key violation `23503`), put the app's error middleware before `errorHandler`, and pass unhandled errors on with `next(err)`.

```ts
app.use('/api', notFound);
app.use(appErrors); // (err, req, res, next) => { if (code === '23503') return sendError(res, 400, '…'); next(err); }
app.use(errorHandler);
```

### IDs and dates

- An ID is a positive integer of 1 to 15 digits, sent as a number in JSON (`"id": 7`). The existing plan-routine sends string IDs (`"id": "7"`) and stays that way because the screens would have to change at the same time. New apps use numbers (#312).
- Path IDs are read with `parseId(req.params.id, '<what of>')`. Only a positive integer of 1 to 15 digits is accepted (no leading zeros, sign, `1e3`, or spaces); otherwise it returns `400 { error: '<무엇의> ID가 올바르지 않습니다' }`. Up to 15 digits is exact as a JS number even for a `BIGINT` column. In Zod schemas, use `ID_PATTERN`.
- "Today" is `serviceDate()` (`YYYY-MM-DD` in Asia/Seoul). Do not use the server clock's time zone.

### Where validation happens

- Input (`req.body`, `req.query`, `req.params`) is validated with the Zod schema's `parse()` on the first line of the route handler. Do not read unvalidated values (`req.body.name`) directly.
- On failure, a `ZodError` is thrown and `errorHandler` turns it into `400`. Do not use `try/catch` in every route (Express 5 passes async errors along).
- Input schemas shared with the screen go in `shared/contract.ts`, and cross-field rules used only by the server go in `backend/src/domain.ts`. Screen forms use the same schemas.

### Sub-repo check warnings

In a repo that has `backend/src/app.ts`, `standards-check` reads the `.ts` files in `backend/src` (excluding tests) and warns about the following. Not every app has the same file structure, so it looks at the rules, not file locations.

- No `app.get('/api/health', …)`
- No error handling middleware in `app.ts` (`app.use(errorHandler)` or `app.use((err, …) => …)`)
- No `app.use('/api', …)` 404 handling in `app.ts`
- An `app.<method>('<path>')` that does not start with `/api`, or whose path segments are not lowercase and hyphenated
- `res.status(4xx|5xx).json({ <key other than error>: … })`
- Direct reads of `req.body.<field>` and `req.query.<field>`
- A zod array schema (`z.array(...)`, `.array()`) with no length limit (`.max()`, `.length()`), or whose limit comes after `.refine`. This is the attack path of security advisory GHSA-mrhx-c7xc-m3w5 (#326). zod 4.6.7 rejects before reading elements only when the length check comes first in a consecutive run (#386)
- `.ts` and `.tsx` file names in `frontend/src` that are not lowercase and hyphenated ([code conventions](conventions/code.md), #312)

### Differences from workout-memo

The basis for the rules is workout-memo. The scaffold adds the parts the other 7 apps fixed first (404 for unknown routes, distinguishing body errors). This was compiled on 2026-10-22 by reading each app's `backend/src`. Running `standards-check` against this baseline gives workout-memo a single "404 for unknown /api paths" warning, and the other 7 apps have no warnings.

| Item | workout-memo | Other 7 apps | Standard (scaffold) |
|---|---|---|---|
| Route location | `routes/<feature>.ts`, `register<Feature>Routes(app, pool)` | study-log and plan-routine, which have feature routes, connect the `Router` in `src/<feature>.ts` with `app.use('/api/<feature>', …)`. The other 5 have no feature routes yet | workout-memo way |
| `/api/health` registration | Directly in `app.ts` | Directly in `app.ts` | `routes/health.ts` |
| `/api/health` success body | `{ status: 'ok' }` | `{ ok: true, service, today }` | `{ status: 'ok' }` (both allowed) |
| Error handler | `errorHandler` in `routes/shared.ts` | Anonymous function in `app.ts` | `errorHandler` in the centrally managed file `standard/http.ts` (#309) |
| Unknown `/api` path | Express default HTML 404 | `404 { error }` | `404 { error }` (`notFound`) |
| Malformed JSON body | `400` generic message | Only study-log gives a `400` dedicated message (`entity.parse.failed`); the rest give `500` | `400` dedicated message |
| Body size exceeded | `413` (backup-specific message) | Only study-log gives `413`; the rest give `500` | `413` |
| Foreign key violation `23503` | `400` dedicated message | None | None (add when building a feature) |
| 500 message | "저장소에 연결할 수 없습니다…" | "서버 오류가 발생했습니다" | "서버 오류가 발생했습니다" (same as the 7 apps) |
| Error response type | None | None | `ApiError` in `shared/contract.ts` |
| OpenAPI descriptions | Read from the `docs/api.md` table | None | Written directly as `summary` in `operations` in `openapi.ts` |
| `today` injection (`createApp(pool, { today })`) | Yes | Yes | None (add when building a date feature) |

## Shared contract (shared/contract.ts)

- `shared/contract.ts` is the single source of input schemas.
- `npm run contract:sync` copies it to `backend/src/contract.ts` and `frontend/src/contract.ts`. This is so each area can build on its own in the subtree repos and the Docker build.
- Do not edit the copies directly. `contract:check` in `npm run check` fails on any mismatch.

## OpenAPI

- When you change API routes, update `operations` in `backend/src/openapi.ts` (a `summary`, request schema, and status codes per path) and regenerate `docs/openapi.json` with `npm run openapi`.
- Request schemas are converted from the server's Zod schemas. All error responses point to `components.schemas.Error` (`{ error }`).
- Tests fail if the registered routes differ from `operations` or the generated file is stale (scaffold and workout-memo `backend/test/openapi.test.ts`).
- Leave `docs/openapi.json` exactly as `JSON.stringify` produced it, and put it in the project section of `.prettierignore`.
