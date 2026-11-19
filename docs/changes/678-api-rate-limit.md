# #678 Managed API rate limit and the client IP

## Change

- `templates/app/backend/src/standard/rate-limit.ts` (managed, new): `apiRateLimit(app)` sets `trust proxy` to 1 and mounts one limiter on `/api` (600 requests per client IP per minute, one JSON message, `/api/health` not counted). The middleware order is in its header: request log, rate limit, body parser, sign-in, routes.
- `templates/app/frontend/nginx.conf.tmpl`: the `/api/` location sends `X-Forwarded-For $proxy_add_x_forwarded_for`. Before, the API saw only the nginx address, so every client shared one bucket.
- `scaffold/app/backend/src/app.ts` calls `apiRateLimit` and documents the order. The body parser now runs before the sign-in, as the issue lists.
- `versions.json` and `scaffold/app/backend/package.json.tmpl`: `express-rate-limit` `8.7.2`, exact. The dependency check is the comment on #678.
- `scaffold/app/backend/test/rate-limit.test.ts`: two client IPs get separate buckets; a client cannot choose its bucket with its own `X-Forwarded-For`; the health check is not counted. It runs in the `scaffold-tests` CI job, which installs the packages.
- `docs/directory-rules.md`: the `backend/src` tree lists the managed `standard/db.ts` (#676), `migrations.ts` and `migrate.ts` (#677), `rate-limit.ts`, and the one-line `migrate.ts` entry (coordinator approved the edit).

## Reason

Five rate-limit variants (600, 700 and 1,200 per minute, different order and messages) existed, two apps had none, and the limiter keyed on the proxy address.

## Follow-up

- Apps replace their own limiter with `apiRateLimit(app)` in their sync follow-up PR and align `express-rate-limit` through the managed fields.
