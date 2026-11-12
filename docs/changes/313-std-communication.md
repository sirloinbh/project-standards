# #313 Central skill std-communication and app skill cleanup

## Change

| File | Content |
|---|---|
| `templates/common/skills/std-communication/SKILL.md` | New shared skill: explanations to the user are in Korean (at the time of this change), and commands, paths, identifiers, and original error text stay as they are |
| `.claude/skills/std-communication/SKILL.md` | This repo's copy |
| `templates/app/AGENTS.md.tmpl`, `AGENTS.md` | Added to the skill guide |
| `scripts/test/agents.test.mjs`, snapshot | Whether the 8 apps and the infrastructure repo receive it, and whether the `.claude/skills/` copy is identical |

## Decisions

- The basis is workout-memo's `workout-communication`. The app name was removed, and "how to write reports" was added (result first, user tasks separate, run results stated as facts).
- No template variables are used. This keeps the copy in this repo's `.claude/skills/` identical to the source.
- It is placed in `templates/common/` so the infrastructure repo receives it too.

## App skill cleanup

Done as app repo PRs (the user merges). Merge after `std-communication` arrives through the sync PR.

- workout-memo: delete `workout-communication` (replaced by the central skill)
- study-log and plan-routine: fix "Vitest and Playwright not yet introduced" in `*-testing`, and the `frontend/src/style.css` token description in `*-foundation`
- `*-implementation` in the three apps: delete lines that are the same as the central `std-implementation` and `std-git-writing`

## Checks

- `npm test`: 488 of 489 passed, 1 skipped, 0 failed
