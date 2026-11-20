# #937 Add the orca-lanes skill as a shared skill

The personal skill `~/.claude/skills/orca-lanes/SKILL.md` (run a repo's open issue cards in parallel through Orca worktree lanes, with one coordinator session) is now a shared skill.

## Change

| File | Content |
|---|---|
| `templates/common/skills/orca-lanes/SKILL.md` | The source. Reworded for any sirloinbh repo: the lane brief is `<orca workspace>/<repo>/LANES.md`, no project-standards-only paths, no Korean text |
| `.claude/skills/orca-lanes/SKILL.md` | This repo's copy (`npm run self`) |
| `templates/app/.prettierignore.tmpl` | The two managed paths (`skills/orca-lanes/`, `.claude/skills/orca-lanes/`), so `npm run format` keeps the hashes |
| `scripts/test/agents.test.mjs` | App repos must receive the skill and its `.claude/skills` mirror |
| `scripts/test/fixtures/sync-snapshot.json` | The two new files downstream repos receive |

## What was decided

- **Not in the plugin.** `scripts/build-plugin.mjs` packages only `std-*` skills, so repos outside sync (`file-control`, `develop-skill`) do not get it. The skill is not a `std-` standard and the name was kept as the user's personal skill name.
- The personal copy is not edited here; the coordinator removes it after the merge.

## Checks

- `UPDATE_SNAPSHOT=1 npm test`, then `npm run check`: passed.
