# #192 Rule for managing local branches with the Fork app

## Change

| File | Content |
|---|---|
| `templates/common/skills/std-git-writing/SKILL.md` | Added "Local branch management (Fork app)" to chapter 3. The agent only creates the branch, commits, pushes, and opens the PR. Local cleanup after merge (switch to main, pull, delete the local branch) and `stash`, `reset`, and `rebase` are not done by the agent. New branches are created from `origin/main` |
| `.claude/skills/std-git-writing/SKILL.md` | Copy of the source |
| `AGENTS.md` | Removed `--delete-branch` from the agent merge command. This option deletes the local branch as well as the remote one |

## Decisions

- On 2026-10-24 the user decided to manage local branches in all projects with the Git GUI app Fork.
- Remote branch cleanup is left to the repo setting "automatically delete branches after merge" (`delete_branch_on_merge`, the recommended value in `docs/repo-settings.md`). It is still off in this repo, so merged remote branches stay until it is turned on.
- When guiding the user through cleanup, write it in terms of Fork instead of commands.

## Downstream repos

- It is a common skill, so it spreads to downstream repos through central sync (#113, #115).

## Verification

- `diff templates/common/skills/std-git-writing .claude/skills/std-git-writing`: no differences
- `npm run check` passed (391 of 392 tests passed, 1 skipped; registry-check, docs check, tokens check, package-guard, check-workflows)
