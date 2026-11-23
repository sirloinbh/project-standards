# #1032 Add a timeout and server-error retries to the GitHub API client

- Issue: [#1032](https://github.com/sirloinbh/project-standards/issues/1032)
- Branch: `fix/1032-github-client-timeout`
- Related: #464

## Changes — 2026-11-23

`createClient` in `scripts/lib/github-app.mjs` (used by sync and compliance):

- Every request gets `signal: AbortSignal.timeout(timeoutMs)`; the default is 30 s (`REQUEST_TIMEOUT_MS`). It covers reading the body too. A stalled connection used to hold the job until the 6-hour limit.
- A GET that fails with a 5xx answer, a network error (`ECONNRESET` and the like) or a timeout is retried up to `maxRetries` (3) times after 1 s, 2 s and 4 s, then fails with the last status or reason. The rate-limit retry from #464 is unchanged.
- A write (POST, PUT, PATCH, DELETE) is never retried on a 5xx or a network error, because it may already have been applied; it fails at once with `GitHub API <METHOD> <path> failed: <reason>`. Messages never contain the token.

## Verification

- `node --test scripts/test/github-rate-limit.test.mjs scripts/test/sync-pr.test.mjs`: 29 passed. Three new tests (503 then network error then 200 succeeds with waits 1 s and 2 s; a GET gives up after the cap and a write is not retried; a hung request is cancelled and the GET is tried again) fail against the old client.
- `npm run check`: passes.
