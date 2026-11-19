# #675 Cap the size of audit before/after values

## Change

- `templates/app/backend/src/standard/audit.ts`: `auditValue(value, omit?)` makes the JSON text stored in `before` and `after`. A value longer than `AUDIT_VALUE_LIMIT` (2,048 characters) becomes a valid JSON summary `{ truncated: true, length, preview }` with the start of the text; the cut never splits a surrogate pair, which PostgreSQL rejects in `jsonb`. `writeAudit` takes an optional `omit` list of keys that are dropped at any depth first (so private text is removed before the size check).
- `scripts/test/backend-audit.test.mjs`: the limit, the exact-limit value, the surrogate pair, `omit` before and after the size check, `undefined` and function values.
- `docs/audit-log.md`: the new columns' behavior.

## Reason

The audit log is kept for 365 days, and `writeAudit` stored whatever the caller passed, so a tool outcome or route could keep a whole private record for a year (reported by plan-routine and study-log).

## Verification

- `node --test scripts/test/backend-audit.test.mjs`: 10 pass.
- `npm run check`: see the PR.
