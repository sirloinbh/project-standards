# #464 Retry GitHub API calls on rate limits in sync and compliance

Part of #463 (reliable sync and compliance automation). On 2026-11-11 three manual `compliance.yml` runs for PR #348 hit GitHub's secondary rate limit and marked 1, 7, and then 6 of 9 repos as `unknown`. Each run still updated the report PR.

## Changes

| Files | Change |
|---|---|
| `scripts/lib/github-app.mjs` | `createClient` retries `429`, and `403` responses that say "rate limit": `retry-after`, then `x-ratelimit-reset`, then 1/2/4 minutes; 3 retries at most, no wait over 15 minutes. New `retryDelay` and `mapLimit` (at most 4 calls in flight) |
| `scripts/compliance.mjs` | Fetches files with `mapLimit` instead of `Promise.all`. Marks statuses lost to a rate limit; `--apply` fails without publishing while any remain |
| `scripts/lib/sync-pr.mjs` | Fetches files with `mapLimit` |
| `docs/github-app.md` | New section "Rate limits" |
| `scripts/test/github-rate-limit.test.mjs` | Delay order, retry then success, retry cap, long wait refused, permission 403 not retried, `mapLimit` order and limit, rate-limited statuses block publishing |

## Decisions

- A permission `403` ("Resource not accessible by integration") is not retried: only messages that mention a rate limit are.
- A rate-limited compliance run exits 1 so the failure shows in Actions, and the previous report stays. Other errors (App not installed) still publish as `unknown` rows, as before.
- 4 parallel requests is a compromise between GitHub's advice (serial) and run time (about 100 files per repo, 9 repos).

## Verification

- `node --test scripts/test/github-rate-limit.test.mjs scripts/test/compliance.test.mjs scripts/test/sync-pr.test.mjs scripts/test/sync.test.mjs`: 42 pass, 0 fail.
- `npm run check`: pass.
- After merge: a manual `compliance.yml` run, to refresh PR #348.
