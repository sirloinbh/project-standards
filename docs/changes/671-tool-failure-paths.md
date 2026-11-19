# #671 Keep the tool error and audit row when ROLLBACK or audit fails

A broken `audit_log` table no longer turns a 403, a 400, or a successful read into a 500.

## Change

| File | Content |
|---|---|
| `templates/app/backend/src/standard/tools.ts` | The audit rows of a denied, invalid, failed, or read call go through a best-effort writer that logs its error (new `log` option). A write's row stays inside its transaction |
| `scripts/test/backend-tools.test.mjs` | A pool whose audit insert rejects (403, 400, read keep their answer), a write whose row fails (rolls back), a ROLLBACK that rejects (original error, client destroyed, error row written) |
| `docs/ai-tools.md` | The audit rows section |

## What was decided

- **The ROLLBACK guard already exists.** `withTransaction` (#676) destroys the client when ROLLBACK fails; the test now covers it for tools.
- **A read answer is still sent when its audit insert fails.** The data was already read and the failure is logged; failing the read would turn an audit outage into an AI outage. Write tools stay fail-closed: no row, no change.

## Checks

- `node --test scripts/test/backend-tools.test.mjs`: 18 passed.
