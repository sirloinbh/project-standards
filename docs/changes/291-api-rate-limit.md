# #291 Rate limit requests to the app backend API

## Approach

| Candidate | Judgment |
|---|---|
| `express-rate-limit` package | Needs install approval and backend code changes in each app |
| A middleware built into the scaffold | No install, but the backend code of the 8 apps must be fixed separately (the scaffold is not a sync target) |
| **nginx `limit_req` (adopted)** | `frontend/nginx.conf` is already a centrally managed file, so one sync reaches all 8 apps. No install or app code change. Every `/api/` request passes through this nginx |

Limit: on average 10 per second per client IP, up to 40 at once (burst, nodelay), and 429 beyond that. In a single-user app, a screen calling a few APIs at the same time does not hit it. Static files are not limited.

## Change

| File | Content |
|---|---|
| `templates/app/frontend/nginx.conf.tmpl` | `limit_req_zone` (outside the server block, read inside the http block), and `limit_req` with `limit_req_status 429` on `/api/` |
| `scripts/test/docker.test.mjs` | Zone location, limit only on `/api/`, and 429 |
| `docs/runbooks/deploy.md` | 4-2 API request rate limit, and a `real_ip` note for when a reverse proxy is introduced |

## Verification

- Checked with real nginx (`nginx:1.27-alpine`): `nginx -t` passed. In front of a fake API, 60 requests in a row gave 42 times 200 and 18 times 429.
- `node --test scripts/test/docker.test.mjs`: 4 passed
- `npm run check`: 463 of 464 tests passed, 1 skipped, 0 failed

## CodeQL alerts

CodeQL `js/missing-rate-limiting` recognizes only limits inside Express code, so an nginx limit does not close the alert. We close the central scaffold alert with a reason. Closing the 71 alerts in the app repos will be done after user confirmation.
