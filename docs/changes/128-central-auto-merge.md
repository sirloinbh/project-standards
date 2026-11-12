# #128 Change the rule so the agent merges central repo PRs

## Change

| File | Content |
|---|---|
| `AGENTS.md` | PRs in this repo are merged by the agent with a merge commit after `npm run check` passes, and then the agent continues with the next issue. Downstream repo PRs, user steps, installs outside the pre-approved scope, and items for the user to decide still go to the user first |
| `templates/common/skills/std-backlog/SKILL.md` | Changed who merges so that each repo's `AGENTS.md` decides. If it is not specified, only the user merges |
| `templates/common/skills/std-git-writing/SKILL.md` | Same rule. If "Check before merging" has an item for the user to decide, do not merge |
| `.claude/skills/` | Updated the copies |

## Why

On 2026-10-22 the user decided: "Central repo work is documents and text, so merge PRs automatically when they come up and continue with the next task." Common skills are also distributed to downstream repos, so the skills only say "who merges is decided by each repo's AGENTS.md", and the permission for automatic merging lives only in this repo's `AGENTS.md`. App repos are still merged by the user, because merging to main is a production deploy.

## Verification

- Compared the skill sources and copies with `diff` (no differences).
- `npm run check` passed.
