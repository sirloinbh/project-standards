# #418 Run destructive git commands without an approval prompt (also closes #361)

## Problem

`git reset --hard`, `git branch -D`, `git clean`, `git stash`, `git rebase` (and the forced forms of `git switch` and `git branch`) were in `permissions.ask`, the Codex rules said `prompt`, and the skill and global instructions said "only when the user asked for and approved them". The user decided on 2026-11-08: "always yes", and re-confirmed on 2026-11-14 by asking to finish #409, which contains #418.

## Change

| File | Content |
|---|---|
| `templates/common/.claude/settings.json.tmpl`, `.claude/settings.json` | Moved every `ask` rule to `allow` (Bash and PowerShell), removed the empty `ask` list, added `git branch -d *`. `deny` (force push, push to main, package installs) and the hooks are unchanged |
| `templates/common/.codex/rules/git-branch.rules`, `.codex/rules/git-branch.rules` | `prompt` became `allow` for the five destructive rules; `git branch -d` is allowed like `--delete`. Force push and push to main stay `forbidden` |
| `templates/common/skills/std-git-writing/SKILL.md`, `.claude/skills/std-git-writing/SKILL.md` | "Commands not used" became "Destructive commands": may be run without asking |
| `tools/global-instructions/git-branches.md` | Same sentence for the global instructions |
| `docs/agent-guardrails.md` | Updated the decision table and the hook table; added "Why destructive git commands run without asking" with scope and reasons |
| `scripts/test/agent-guardrails.test.mjs`, `tools/check-git-permissions.mjs` | Tests and the PC check now expect these commands to run |

The user's global `~/.claude/CLAUDE.md` was edited by hand (not in git).

## Checks

- `npm run check`: see the PR.
- Done-when for #361 and #418 that only the user can do in an interactive new session: confirm `git switch main`, `git pull --ff-only`, `git branch --delete` run without a prompt, that `git branch -D` and `git reset --hard` now run without a prompt, and comment the result per PC. Also run `git-branch.rules` through a real Codex parser (`codex execpolicy check`) on a PC with Codex.
