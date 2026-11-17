# API request logs

Every app API writes one JSON line per request and gives each request an ID (#552). The ID ties together the nginx request, the API log line, and an error logged for the same request; the audit log (#553) and jobs reuse it.

## Where it comes from

| Step | File | What it does |
|---|---|---|
| nginx | `frontend/nginx.conf` (managed) | Keeps the caller's `X-Request-Id`, else uses nginx's random `$request_id`, and passes it to the API |
| API | `requestLog` in `backend/src/standard/http.ts` (managed) | Keeps an incoming ID that matches `^[\w.-]{1,128}$` (anything else is replaced, so a client cannot write arbitrary text into the log), else creates a UUID. Sets it on `res.locals.requestId` and in the `X-Request-Id` response header, and logs one line when the response ends |
| Errors | `errorHandler` in the same file | The line for an unexpected 500 carries the same `requestId` |
| App | `backend/src/app.ts` (app-owned) | `app.use(requestLog)` before the sign-in and every route. The standards check warns when it is missing |

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

## Searching

On the server, in the app folder (`/opt/<app>`):

```sh
docker compose logs api | grep '"requestId":"5f0c'      # one request
docker compose logs api --since 1h | grep '"level":"error"'
docker compose logs api --since 1h | grep '"status":5'
```

In the browser, the request ID is the `X-Request-Id` response header in the network panel; quote it in an issue to find the matching lines.

## Later

- A shared logger package (`pino`, or `@sirloinbh/logging`) is not used yet: the middleware is about 30 lines with Node built-ins, and the logs go to `docker compose logs`. Revisit when log collection is decided (#554); installing a package follows [dependency-policy.md](dependency-policy.md).
