# API request logs

Every app API writes one JSON line per request and gives each request an ID (#552). The ID ties together the nginx request, the API log line, and an error logged for the same request; the audit log (#553) and jobs reuse it.

## Where it comes from

| Step | File | What it does |
|---|---|---|
| nginx | `frontend/nginx.conf` (managed) | Keeps the caller's `X-Request-Id`, else uses nginx's random `$request_id`, and passes it to the API |
| API | `requestLog` in `backend/src/standard/http.ts` (managed) | Keeps an incoming ID that matches `^[\w.-]{1,128}$` (anything else is replaced, so a client cannot write arbitrary text into the log), else creates a UUID. Sets it on `res.locals.requestId` and in the `X-Request-Id` response header, and logs one line when the response ends |
| Errors | `errorHandler` in the same file | The line for an unexpected 500 carries the same `requestId` |
| App | `backend/src/app.ts` (app-owned) | `app.use(requestLog)` before the sign-in and every route (only the health check may come first). The standards check warns when it is missing or comes after a route (#658) |

## Format

One JSON object per line on stdout (`console.log`), or stderr (`console.error`) for 5xx:

```json
{"time":"2026-11-17T02:16:19.506Z","level":"info","requestId":"5f0c…","method":"GET","path":"/api/workouts","status":200,"ms":12}
{"time":"2026-11-17T02:16:20.101Z","level":"error","event":"request_error","requestId":"7a91…","message":"connect ECONNREFUSED 127.0.0.1:5432"}
```

| Field | Meaning |
|---|---|
| `time` | ISO 8601, UTC |
| `level` | `info` below 400, `warn` for 4xx, `error` for 5xx and logged errors |
| `requestId` | The request's ID; also the `X-Request-Id` response header |
| `method`, `path` | The path without the query string, so query values (which can hold user data) stay out of the log |
| `status`, `ms` | Response status and time from the middleware to the end of the response |

The log line holds no body, header, cookie, or user data.

### Other error lines

Three more places write one JSON line with `"level":"error"` and no request ID, so they are not tied to a request:

```json
{"time":"2026-11-23T03:10:02.417Z","level":"error","message":"Database connection failed","error":"Connection terminated unexpectedly","code":"ECONNRESET"}
{"time":"2026-11-23T03:10:09.002Z","level":"error","event":"audit_write_failed","message":"Tool audit row could not be written","error":"relation \"audit_log\" does not exist"}
{"time":"2026-11-23T03:10:15.880Z","level":"error","event":"jobs_error","message":"Connection terminated unexpectedly"}
```

| Line | Written by | Meaning |
|---|---|---|
| `Database connection failed` | `createPool` in `standard/db.ts` (#1003) | A pg connection was lost, idle or inside a transaction. The process keeps running; `code` is the error code (for example `ECONNRESET`) when there is one. No stack trace |
| `audit_write_failed` | `registerToolRoutes` in `standard/tools.ts` (#1036) | The `audit_log` row of a denied, invalid, or failed AI tool call (or a read) could not be written; the caller still got its normal answer |
| `jobs_error` | `startJobs` in `standard/jobs.ts` | pg-boss reported an error. A failed job run is a separate line with `queue`, `jobId`, `attempt` and `result` |

An app can pass its own `log` to `createPool` and `registerToolRoutes`; keep the one-line JSON shape with `level: "error"` so the daily report still counts it.

## Searching

On the server, in the app folder (`/opt/<app>`):

```sh
docker compose logs api | grep '"requestId":"5f0c'      # one request
docker compose logs api --since 1h | grep '"level":"error"'
docker compose logs api --since 1h | grep '"status":5'
```

In the browser, the request ID is the `X-Request-Id` response header in the network panel; quote it in an issue to find the matching lines.

## Daily error alert (#636)

[ADR-0021](adr/0021-error-alerts-from-logs.md): there is no error tracker or log service. The daily report (`deploy/report.sh`, 04:00 Seoul) counts the error lines and uses the existing `report` signal.

- It counts lines with `"level":"error"` in `docker compose logs --since 24h api` and adds `errors=<N>` to the report line. An unexpected 500 writes two error lines with the same request ID (the handler line and the request line), so one failure can count as 2.
- Every line with `"level":"error"` counts, so a lost database connection and a failed audit write (see [Other error lines](#other-error-lines)) count too; before #1003 and #1036 they were multi-line stack traces and were not counted. A line without a `requestId` is listed as `no-id`, and all such lines share that one entry. Find them with `docker compose logs api --since 24h | grep '"level":"error"' | grep -v requestId`.
- When N is above 0 the line also lists up to 5 entries `<requestId> <status> <path>`. The error `message` never goes into the ping body, because a message from Postgres or a library can quote a value.
- The signal is `fail` when N is over `REPORT_ERROR_LIMIT` (server `.env`, default `0`: any error fails the day), and healthchecks.io emails on `fail`. Raise the limit for one app with a known noisy error, and open an issue for it ([env-conventions.md](env-conventions.md#server-only-keys-report-thresholds-636)).
- A deploy replaces the `api` container, and `docker compose logs` then shows only the new one. So `remote-deploy.sh` appends the old container's error lines of the last 24 hours to `/opt/<app>/.errors-before-deploy.log` just before `docker compose up -d` (deploy and rollback), and the report counts that file with the live logs and then empties it.
- Logs are still limited by the Docker `json-file` size (10 MB x 3 per container), so the report has to run before a noisy app's errors roll off.

To find the cause of an entry such as `errors=2 [5f0c… 500 /api/workouts]`, run on the server in `/opt/<app>`:

```sh
docker compose logs api | grep '"requestId":"5f0c'    # the live container; the whole ID or a prefix
grep '"requestId":"5f0c' .errors-before-deploy.log     # lines saved by a deploy, until the next report empties the file
```

An entry from before a deploy is no longer in `docker compose logs`, and the report empties the saved file after it counts it. Copy the line from the file before the 04:00 run if you need the message.

## Later

- A shared logger package (`pino`, or `@sirloinbh/logging`) is not used yet: the middleware is about 30 lines with Node built-ins, and the logs go to `docker compose logs`. Revisit when log collection is decided (#554); installing a package follows [dependency-policy.md](dependency-policy.md).
