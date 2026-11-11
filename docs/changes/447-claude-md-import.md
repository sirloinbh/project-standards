# #447 Make CLAUDE.md import AGENTS.md

Part of #446 (agent harness). `CLAUDE.md` pointed to `AGENTS.md` only with a markdown link, which Claude Code does not follow, so sessions started without the work procedure and prohibited actions. Both CLAUDE.md files now use `@` imports.

## Changes

| Files | Change |
|---|---|
| `CLAUDE.md` | Imports `@AGENTS.md`. The requirements source `docs/bootstrap-prompt.md` stays a link. Rewritten in English |
| `templates/app/CLAUDE.md.tmpl` | Imports `@AGENTS.md` and `@AGENTS.project.md`. Rewritten in English |
| `docs/agent-guardrails.md` | New section "What CLAUDE.md loads every session": import vs link rule and the 200-line budget |
| `scripts/test/agents.test.mjs` | App CLAUDE.md must have both import lines; the central CLAUDE.md must import AGENTS.md and must not import anything under `docs/` |

## Decisions

- AGENTS.md is imported, not copied, because Codex reads it directly and it stays the single source.
- Files only some tasks need (`docs/bootstrap-prompt.md`, design and rule docs) stay links.
- The infra repo gets no CLAUDE.md from the templates, so it is unchanged.

## Lines loaded every session (2026-11-11)

Global `~/.claude/CLAUDE.md` does not exist on this PC (0 lines; #448 recorded 11 lines on another PC). App AGENTS.md and CLAUDE.md come from `npm run sync:preview`; `AGENTS.project.md` from each repo's main.

| Repo | CLAUDE.md | AGENTS.md | AGENTS.project.md | Total |
|---|---|---|---|---|
| project-standards | 8 | 79 | — | 87 |
| cert-manager | 10 | 51 | 19 | 80 |
| dev-career-portfolio | 10 | 51 | 15 | 76 |
| health-log | 10 | 51 | 16 | 77 |
| life-journal | 10 | 51 | 15 | 76 |
| money-ledger | 10 | 51 | 36 | 97 |
| plan-routine | 10 | 51 | 16 | 77 |
| study-log | 10 | 51 | 16 | 77 |
| workout-memo | 10 | 51 | 66 | 127 |

All are under 200 lines, even with the 11-line global file.

## Verification

- Fresh headless session (`claude -p --model sonnet --tools ""`) in this repo, asked to copy the first bullet under `## 금지 사항` without tools: it returned the exact AGENTS.md line. The same prompt in a temporary folder with the old CLAUDE.md and the same AGENTS.md returned `NOT LOADED`. `/memory` itself is interactive, so this headless check stands in for it.
- `UPDATE_SNAPSHOT=1 npm test`: 524 tests, 519 pass, 0 fail, 5 skipped. The snapshot did not change (same file list).
- `npm run check`: pass.
