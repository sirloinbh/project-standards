# #454 Switch agent replies and GitHub writing to English

The user decided on 2026-11-10 to use English for input and output from now on. The shared rules forced Korean, so they were switched to English.

## Changes

| File | Change |
|---|---|
| `templates/common/skills/std-communication/SKILL.md` | Replies to the user are in English, even when the user writes in Korean |
| `templates/common/skills/std-git-writing/SKILL.md` | Translated to English; issues, branches, commits, and PRs are written in English (imperative titles) |
| `templates/common/skills/std-backlog/SKILL.md` | Translated to English; section names follow the new issue template |
| `templates/common/.github/ISSUE_TEMPLATE/task.md`, `pull_request_template.md` | Section headings in English: Summary, Why, Tasks, Done when, Blocked by, Notes / What changed, Why, Main changes, Verification, Check before merging, Impact |
| `scripts/lib/sync-pr.mjs`, `scripts/compliance.mjs` | Auto-generated PR bodies and comments in English |
| `AGENTS.md`, `templates/app/AGENTS.md.tmpl`, `docs/git-conventions.md` | Point to the English rule |
| `.claude/skills/`, `.github/` | Replicas copied from the sources |

## Not changed on purpose

- The sync bot commit prefix `chore: 중앙 표준 동기화 (project-standards@` and the compliance commit title. The bot uses the prefix to tell its own commits from direct commits (#367); changing it would make open sync branches look edited. Migrating it belongs to #455.
- The release body format `- 배포 실행:` that `sync-pr.mjs` parses from `publish.yml` releases.
- Other Korean text in templates and docs: #455 and #456.

## Outside the repo

- `~/.claude/skills/korean-explanations` moved to `~/.claude/skills/.trash/`, replaced by `english-explanations`.
- `~/.claude/CLAUDE.md` translated to English with a language section.

## Verification

- `npm test`: 523 tests, 505 pass, 7 fail, the rest skipped (tools missing locally). The 7 failures are in `deploy-templates.test.mjs` and fail the same way on unchanged `origin/main` locally (bash on Windows); CI runs on Linux.
- `registry:check`, `docs:check`, `tokens:check`, `packages:check`, `workflows:check`, `secrets:check`: all pass.
