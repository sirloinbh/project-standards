# #448 Split path-specific rules into .claude/rules

Part of #446 (agent harness). After #447 imported AGENTS.md into every session, rules that matter only for some paths were loaded every time. They now live in path-scoped `.claude/rules/` files.

## Classification

| AGENTS.md part | Where it is now |
|---|---|
| Work procedure, prohibitions, project basics (stack, ports, DB name, dates), centrally managed files, skill list, records, `npm run check` | AGENTS.md (every session) |
| Migrations, DB integration tests | `templates/app/.claude/rules/database.md` (`database/**`, `backend/**`) |
| Server-side validation, transactions, validation messages | `templates/app/.claude/rules/backend.md` (`backend/**`) |
| Browser check at 390×844 and 1440×900 | `templates/app/.claude/rules/frontend.md` (`frontend/**`) |
| Skill source vs copy, docs- or skills-only checks | `templates/app/.claude/rules/docs-and-skills.md` (`docs/**`, `skills/**`, `.claude/skills/**`) |
| Central "sources and copies" table | `.claude/rules/sources-and-copies.md` (this repo only) |
| Central "sync and deploy" section | `.claude/rules/sync-and-deploy.md` (this repo only) |
| Task procedures (sync PR handling, compliance PR) | Stay for #449 (skills) |

## Changes

| Files | Change |
|---|---|
| `templates/app/.claude/rules/*.md` (4 files) | New path-scoped rules, written in English |
| `templates/app/AGENTS.md.tmpl` | Moved lines removed; one pointer line to the rules (51 → 47 lines as rendered) |
| `.claude/rules/*.md` (2 files), `AGENTS.md` | Central path rules; AGENTS.md has a "Path-specific rules" section with links (79 → 65 lines) |
| `templates/app/.prettierignore.tmpl` | Ignores `.claude/rules/` so formatting keeps the managed hashes |
| `scripts/test/agents.test.mjs` | Every synced rule has `paths:`; line budget: apps ≤ 120 (CLAUDE.md + AGENTS.md), this repo ≤ 180 |
| `scripts/test/fixtures/sync-snapshot.json` | 8 apps get the 4 rule files |
| `docs/agent-guardrails.md` | Path-specific rules and the budget test |

## Decisions

- Codex does not read `.claude/rules/`, so AGENTS.md keeps a one-line pointer to every rule file.
- The budget is tested for the synced part only. `AGENTS.project.md` belongs to each project; its lines are measured below.
- The infra repo gets no rules (it has no app paths).

## Lines loaded every session (2026-11-11)

Global `~/.claude/CLAUDE.md`: 0 on this PC (11 on the other PC). App files from `npm run sync:preview`; `AGENTS.project.md` from #447.

| Repo | CLAUDE.md | AGENTS.md | AGENTS.project.md | Total | Before (#447) |
|---|---|---|---|---|---|
| project-standards | 8 | 65 | — | 73 | 87 |
| cert-manager | 10 | 47 | 19 | 76 | 80 |
| dev-career-portfolio | 10 | 47 | 15 | 72 | 76 |
| health-log | 10 | 47 | 16 | 73 | 77 |
| life-journal | 10 | 47 | 15 | 72 | 76 |
| money-ledger | 10 | 47 | 36 | 93 | 97 |
| plan-routine | 10 | 47 | 16 | 73 | 77 |
| study-log | 10 | 47 | 16 | 73 | 77 |
| workout-memo | 10 | 47 | 66 | 123 | 127 |

All are under 200 lines, also with the 11-line global file.

## Verification

- Fresh session (`claude -p --model sonnet --tools Read`) that read `sync.config.json` quoted the first bullet of `sync-and-deploy.md`; the same question without reading a file returned `NOT LOADED`.
- `UPDATE_SNAPSHOT=1 npm test` and `npm run check`: 539 tests, 534 pass, 0 fail, 5 skipped; all other checks pass.
