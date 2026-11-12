# #359, #360 Remove the Fork app rule and switch to git CLI branch rules

## Change

| File | Content |
|---|---|
| `templates/common/skills/std-git-writing/SKILL.md`, `.claude/skills/std-git-writing/SKILL.md` | Replaced the section "Local branch management (Fork app)" with "Local branch management (git CLI)". It describes starting work, cleanup after merge, the conditions to stop, and the commands not to use |
| `AGENTS.md` | Changed the reason for not using `--delete-branch` to the git CLI cleanup procedure |
| `docs/tools.md`, `docs/user-steps.md` | Changed the Fork guidance to git commands |
| `docs/research/multi-repo-tools.md`, `tools/repos.mjs` | Removed mentions of Fork. In `repos.mjs` only a comment changed, and behavior is the same |

## Decisions

- On 2026-10-31 the user decided to cancel the Fork app rule (#192) and switch to the git CLI.
- The agent does the cleanup after merge itself: `git switch main`, `git pull --ff-only`, `git branch -d <branch>`, `git fetch --prune origin`.
- Items the user did not decide separately keep the current rule.
  - `git stash`, `git rebase`, `git reset --hard`, `git clean`, and `git branch -D` are used only when the user asked for and approved them.
  - `pr merge --delete-branch` is not used. The repo setting deletes the remote branch.
- If `git branch -d` is refused, do not switch to `-D`. For a branch merged with a merge commit, `-d` passes against the latest main.
- For the OneDrive folder lock (one of the reasons Fork was chosen in #192), answer the retry question with `n` and report the result.
- `docs/changes/` was not fixed because it is a record of its time.

## Checks

- The result of `npm run check` is written in the PR body.
- Check with `git grep -n -i fork -- . ':!docs/changes'` that no branch rules or guidance remain.
