# 0024. Audit AI tool calls; routes are optional

- Status: Accepted (issue #694, parent #712; user decision relayed 2026-11-19: option A)
- Date: 2026-11-19
- Builds on: [ADR-0017](0017-ai-service-mcp-and-shell.md) and the audit log of #553 and #559; the architecture review of 2026-11-18 (cert-manager, dev-career-portfolio and plan-routine reports).

## Context

- `standard/audit.ts` promised "one audit_log row for each change a user or an AI tool makes, so the owner can see what happened and undo it".
- Survey of the 8 apps on 2026-11-19:
  - Only workout-memo has an `audit_log` table (migration `017_audit_log.sql`). It writes rows from 3 of its about 26 mutating routes (workouts create, update and delete) and from its 2 AI tools.
  - The other 7 apps have no table and no `writeAudit` call. Their `audit.ts` and `tools.ts` are unused copies, because none of them registers AI tools yet.
  - Nothing reads audit rows: there is no undo, history endpoint or UI. The only reader is a manual `psql` query (`docs/audit-log.md`), and the nightly backup deletes old rows.
  - Routes run their own SQL with `pool.query` and inline transactions. There is no shared service layer or transaction helper, so auditing every route means touching about 180 routes in 8 apps.

## Decision

1. The audit log covers **AI tool calls**: every call through `defineTool` writes one row (`ok`, `denied` or `error`), as today. This is the risk the log exists for: a non-human client that changes data.
2. App HTTP routes are **not required** to write audit rows. An app may use `writeAudit` in a route when its history is worth the extra code (workout-memo keeps its three workout routes).
3. The "undo" promise is dropped. There is no undo or history feature. The owner reads the log with `psql`.
4. An app adds the `audit_log` table (the scaffold's `002_audit_log.sql`) with its **first AI tool**, not before. New apps from the scaffold already have it.
5. The `audit.ts` header, `docs/audit-log.md` and the scaffold migration comment state this.

## Options considered

- **A (chosen):** audit AI tool calls only. Cheapest, matches what exists, covers the real risk.
- **B:** every route audits (undo and history as a product feature). About 180 routes, a transaction wrapper or refactor per app, and an undo and history endpoint and UI that exist nowhere. Worth it only if history becomes a product feature, for example for money-ledger or health-log.
- **C:** drop the mechanism. It would remove the only part that works (the AI tool trail that ADR-0017 and #559 rely on).

## Consequences

- No code changes in the apps. The apps without a table do not need one until they get an AI tool, so #711 (the migration in 7 apps) is rescoped to "with the first AI tool of each app".
- A tool call in an app with no table fails with "relation does not exist", so adding the first tool must add the migration in the same PR. `docs/ai-tools.md` already tells an app to register tools through `defineTool`.

## Revisit when

- An app wants an undo or history screen. Then audit that app's routes (B) for the entities involved, behind a shared transaction helper rather than route by route.
