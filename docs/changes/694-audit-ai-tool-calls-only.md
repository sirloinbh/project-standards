# #694 Audit AI tool calls; routes are optional

Decision recorded in [ADR-0024](../adr/0024-audit-ai-tool-calls-only.md) (user decision relayed 2026-11-19, option A).

| File | Change |
|---|---|
| `docs/adr/0024-audit-ai-tool-calls-only.md` | New ADR with the survey of the 8 apps and the three options |
| `templates/app/backend/src/standard/audit.ts` | Header comment only: AI tool calls are audited, routes may; the "undo" promise is gone. No code change, so the managed file changes in the 8 apps by a comment |
| `docs/audit-log.md` | Intro states the rule and that there is no undo or history feature |
| `scaffold/app/database/migrations/002_audit_log.sql` | Comment only |

Follow-up: #711 (audit_log migration in 7 apps) is rescoped to "with each app's first AI tool" (comment on the issue). No app code changes.

Checks: `node --test scripts/test/*.test.mjs` 521 pass; `npm run check` result is in the PR.
