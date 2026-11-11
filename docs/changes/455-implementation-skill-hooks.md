# 455 Translate the std-implementation skill, Codex rules, and hooks

Issue: #455

## What was translated

- `templates/common/skills/std-implementation/SKILL.md`: whole body.
- `templates/common/.codex/rules/git-branch.rules` and `package-installs.rules`: `justification` strings.
- `templates/common/.codex/hooks.json.tmpl` and `.codex/hooks.json`: `statusMessage`.
- `templates/common/.claude/hooks/pc-setup-notice.mjs`: setup steps and notice text.
- `templates/common/.claude/hooks/block-package-installs.mjs`: block messages written to stderr.
- Copies under `.claude/hooks/` and `.codex/rules/` were updated to match their sources.

## What was kept

- The first line of each file that starts with `중앙 관리 파일. 수정은 sirloinbh/project-standards의`. This is `HEADER_TEXT` in `scripts/lib/render.mjs`, and tools match on it. It is migrated separately.

## Verification

- `grep -nP '[\x{AC00}-\x{D7A3}]'` over the group shows only the four header lines.
- No test asserted the changed strings.
- `npm run check` was run in the worktree.
