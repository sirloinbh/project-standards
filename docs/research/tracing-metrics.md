# Do the apps need shared tracing and metrics beyond `requestLog`? (#1060)

- Status: recommendation (2026-11-23): no OpenTelemetry, no metrics service, no shared logging package. One small step is worth doing (request ID on calls to the shared services); a second is optional.
- Date: 2026-11-23
- Builds on: [logging.md](../logging.md), [ADR-0021](../adr/0021-error-alerts-from-logs.md) (logs plus a daily count, no tracker), [ADR-0019](../adr/0019-claude-call-tracking-without-gateway.md) (data leaving the server is a cost), [costs.md](../costs.md) (memory on the shared server)

## What exists

- `requestLog` (managed `standard/http.ts`) gives every request an ID, returns it in `X-Request-Id`, and writes one JSON line with `method`, `path`, `status`, and `ms` (response time). nginx keeps or creates the same ID.
- The error handler, `createPool` connection errors, failed audit writes, and `jobs_error` are single JSON lines with `"level":"error"` ([logging.md](../logging.md)). Jobs and `audit_log` rows carry the request ID.
- The daily report counts error lines and lists up to 5 request IDs (ADR-0021).
- So one request can be followed from the browser (`X-Request-Id`) through nginx, the API line, its audit row and its jobs. Response time per request is already in the log.

## Debugging cases the logs could not answer

I scanned the bug issues opened since 2026-10-23 in this repo, the 8 apps, `shared-auth`, `shared-ai` and `shared-aws-infrastructure` (147 issues, `gh issue list --label bug`), looking for any that says the logs or request IDs were not enough.

- None says so. These bugs were found by code audits and reviews (for example workout-memo#361 and #371 cite file and line, not a failed investigation), and most are UI, validation and data-handling fixes.
- The log-related problems that did turn up were about the **format**, not missing tracing: a multi-line stack trace beside JSON lines (#1003) and an audit failure that did not reach the daily count (#1036). Both are fixed as single JSON lines.
- With one owner and a few users the volume is a few errors a day (ADR-0021), so the cases that tracing helps with (a slow call across many services, sampling at high volume) have not appeared.

One real gap, found by reading the code: **the request ID does not leave the API.** `createAuthMiddleware` in `@sirloinbh/auth-client` calls the auth service with only the `cookie` header, so when a request fails with 503 because the session check failed, the auth service's log cannot be matched to the app's line. The same will hold for calls from the apps to `shared-ai` and from `shared-ai` to the apps' tool routes unless the ID is passed. That is the case a trace would solve across services, and a header solves it.

## Options

| | (A) Keep as is | (B) Small steps | (C) OpenTelemetry SDK + collector | (D) Metrics endpoint + scraper and dashboard |
|---|---|---|---|---|
| What it gives | What is above | `X-Request-Id` on calls to `shared-auth` and `shared-ai` and logged there; optional slow-request count in the daily report | Spans per request and per outgoing call, a trace UI | Counters and histograms per route over time, graphs |
| Memory | 0 | 0 | Per Node process: no measurement here. Third-party figures are 20 to 130 MB per process (weak sources, old versions: a [2026 comparison post](https://dev.to/johalputt/hot-take-opentelemetry-120-is-too-bloated-for-small-nodejs-22-services-compared-to-sentry-240-19ge) reports about 128 MB for a hello-world service, [another](https://dev.to/johalputt/opentelemetry-125-vs-datadog-2026-tracing-overhead-for-1000-rps-microservices-workloads-measured-2gjl) about 118 MB per pod). A collector and a trace store come on top. 8 apps plus `shared-auth` and `shared-ai` would use 200 to 1,300 MB of the roughly 900 MiB left after the OS and builds ([costs.md](../costs.md)) | A scraper and a time-series store or dashboard (Prometheus and Grafana together need hundreds of MiB), plus a client library in each API |
| Data leaving the server | None | None | None if self-hosted; with a hosted back end, paths, IDs and timings of personal-data apps go to a third party (the argument of ADR-0019) | None if self-hosted |
| New dependency | None | None (a header in an existing package) | The SDK, instrumentations, an exporter (14-day rule, user confirmation) in every API | A metrics library per API |
| Upkeep | None | Tiny | SDK upgrades in 8 apps, collector and store upgrades | A scraper and a dashboard to patch |
| Fits traffic of one owner | Yes | Yes | No: sampling and dashboards are for volume we do not have | No: a daily count and `ms` in the log are enough |

The three smaller-step ideas in the issue:

- **Shared log package (`pino` or one of our own).** `requestLog`, `createPool`, `registerToolRoutes` and `startJobs` already write the same single-line JSON shape through managed files, and an app passes its own `log` where it wants to. A package adds a dependency and a version to every app for no new field. Not adopted (ADR-0021 reached the same conclusion).
- **A timing field per request.** Already there: `ms` in every request line. The gap is that nothing reads it. The daily report could add `slow=<N>` for lines with `ms` above a limit (for example 2,000), with the slowest request ID, as it does for errors: about 15 lines in `report.sh`, no process, no ping change. Optional; useful only once a slow route is suspected.
- **`shared-ai` call tracing.** ADR-0019 already records tokens, model, latency and tool calls per conversation inside `shared-ai`. Carrying the request ID through the call (below) joins that record to the app's log without a new system.

## Recommendation

(A) plus the one cheap step of (B):

1. **Pass `X-Request-Id` on outgoing calls and log it where it arrives.** In `@sirloinbh/auth-client`, `createAuthMiddleware` takes the request's ID (from `res.locals.requestId`, set by `requestLog`) and sends it as `X-Request-Id` to the auth service. `shared-auth` and `shared-ai` keep an incoming valid ID in their own request log (the same `requestLog` pattern), and `shared-ai` passes it on to the apps' tool routes. A package release needs a tag push by the user. One small issue per part.
2. Optional, later: the `slow=` count in the daily report. Not registered now; ask for it when a slow route is first suspected.
3. Do not add OpenTelemetry, a metrics endpoint, or a log package. Look again if the server grows beyond one owner's traffic, a case appears that the logs could not answer (this document's scan found none), or a hosted observability decision is made for another reason.

## Follow-up issues

- #1082 (under #1051): pass the request ID from `@sirloinbh/auth-client` to the auth service and keep it in the auth service's log (central part: package change and tests; `shared-auth` and `shared-ai` adoption follows through their own repos' sessions).
