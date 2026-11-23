# #1037 Document the non-request error log lines and what the daily report counts

## Change

- `docs/logging.md`: a new "Other error lines" section with an example and a table for the lines without a request ID: `Database connection failed` (#1003), `audit_write_failed` (#1036) and `jobs_error`. The "Daily error alert" section now says that these lines count toward `errors=N`, that a line without a `requestId` is listed as `no-id` (all of them as one entry), and how to find them.

## Reason

Since #1003 and #1036 a lost database connection and a failed audit write are JSON lines with `"level":"error"`, so the daily report counts them (before, they were stack traces and were not counted). The page described only the request line.

## Verification

- Field names and values match `db.ts`, `tools.ts` and `jobs.ts`; the examples parse as JSON.
- `npm run check:docs`: see the PR.
