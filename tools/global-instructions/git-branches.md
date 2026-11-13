## Manage local branches with the git CLI

Local Git branches in every project are managed with the git CLI. The source rule is the std-git-writing skill section "Local branch management (git CLI)" in `sirloinbh/project-standards`.

- Start work: check the current branch and working tree with `git status`, then run `git fetch origin` and `git switch --create <branch> origin/main` in that order. Do not touch local main.
- Clean up after merge: after confirming the PR is merged, run `git switch main`, `git pull --ff-only`, `git branch --delete <branch>`, and `git fetch --prune origin` in that order.
- Stop and tell the user if there are uncommitted changes, the branch to delete is not merged, another session or worktree uses it, or `git pull --ff-only` fails.
- If `git branch --delete` is refused, do not switch to `--force` or `-D`; report the reason.
- If a folder lock makes git ask whether to retry, answer `n` and do not repeat the command. Check the result with `git branch --list <branch>` and report it.
- `git branch -D`, `git reset --hard`, `git clean`, `git stash`, and `git rebase` may be run without asking the user. Never force-push or push directly to main.
- Do not add `--delete-branch` to `pr merge`.
