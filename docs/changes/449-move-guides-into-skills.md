# Move guides into skills (#449)

## What changed

- Moved the UX and accessibility audit procedure from `docs/conventions/ux-audit.md` to the new app skill `templates/app/skills/std-ux-audit/SKILL.md`. Apps now load it only when an audit is requested; only its description is loaded every session.
- Central links to the old document (`README.md`, `docs/design-system.md`, `docs/research/multi-repo-tools.md`) now name the skill. Links from the skill to central docs use absolute GitHub URLs.
- `templates/app/AGENTS.md.tmpl` lists the skill in one line under "Skills and docs".
- Updated the sync snapshot (apps get `skills/std-ux-audit/SKILL.md` and its `.claude/skills/` mirror) and the shared-skill test.

## Not moved

- `docs/conventions/database.md` is read by a scaffold test and CI comments, and holds central-only sections (shared CI, runner adoption), so it stays.
- `docs/conventions/domain.md` and `docs/design-system.md` are reference rules that apply to most UI work, so they stay.

## Verification

- `UPDATE_SNAPSHOT=1 npm test`: 0 failures.
- `npm run check`: passes.
