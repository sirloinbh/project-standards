# 455 agents: translate agent instructions to English

Issue: #455

## What was translated

- `AGENTS.md` (central)
- `templates/app/AGENTS.md.tmpl`
- `templates/app/skills/std-testing/SKILL.md` (body and title)
- `templates/app/skills/std-foundation/SKILL.md` (body and title)
- Tests in `scripts/test/agents.test.mjs` and `scripts/test/sync-pr.test.mjs` that assert the changed strings.

## What was kept in Korean, and why

- `chore: 중앙 표준 동기화 (project-standards@` in `AGENTS.md`: the sync bot matches this commit prefix.
- `[직접]` in `AGENTS.md`: it is a label-like marker matched in issues.
- `"중앙 관리 파일"` in `templates/app/AGENTS.md.tmpl`: it names the header text that tools match (`HEADER_TEXT`); an English gloss was added.
- The one Korean line in `templates/common/skills/std-git-writing/SKILL.md` is the commit prefix above, so it is unchanged.

## Verification

- `npm run check`: 534 pass, 0 fail.
- The list of files apps receive did not change, so the snapshot is unchanged.
