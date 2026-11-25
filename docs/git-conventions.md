# Git conventions

The [std-git-writing](../templates/common/skills/std-git-writing/SKILL.md) skill is the source of truth for how to write issues, branches, commits, and PRs. This document summarizes it and covers the repo settings and the merge policy.

## Summary

| Item | Rule | Example |
|---|---|---|
| Issue title | No prefix; one English imperative sentence saying "what it does" | `Add registry source files and conflict check` |
| Issue body | The 6 template sections: Summary, Why, Tasks, Done when, Blocked by, Notes (in English) | `.github/ISSUE_TEMPLATE/task.md` |
| Labels | 1 priority, 1 `type`, at least 1 `area` | [std-backlog](../templates/common/skills/std-backlog/SKILL.md) |
| Branch | `<type>/<issue-number>-<english-summary>` | `feat/44-registry-files` |
| Commit | Conventional Commits, English description (imperative), issue number | `feat: add registry conflict check (#44)` |
| PR title | Same format as the commit title | |
| PR body | The 6 template sections + `Closes #number` | `.github/pull_request_template.md` |
| Work record | `docs/changes/<issue-number>-<slug>.md` in the same commit as the implementation and tests | |

`type`: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`

Reviewing PRs follows the [std-code-review](../templates/common/skills/std-code-review/SKILL.md) skill. To write an issue card outside Claude Code (for example in claude.ai chat), use the copy-paste prompt in [issue-prompt.md](issue-prompt.md).

## Merge policy

| Repo | Who merges | Why |
|---|---|---|
| project-standards | The agent (merge commit after CI passes) | User decision (2026-10-22, #128). The work is docs, text, and scripts |
| The 8 app repos | The agent, after the review loop and green CI | User decision (2026-11-15, #591). Merging to main is a production deploy; the user chose auto-merge there too |
| shared-auth, shared-ai | The agent, after the review loop and green CI | User decision (2026-11-15, #591). Merging is not applying: a server deploy still needs the user |
| shared-aws-infrastructure | The agent, after the review loop and green CI | User decision (2026-11-15, #591). Merging is not applying: `terraform apply` still needs the user |

- The review loop is [std-code-review](../templates/common/skills/std-code-review/SKILL.md) section 8: 1 or 2 rounds (more only while blocking findings remain), fixes on the same branch, a new issue for big problems outside the PR, then `pr merge --merge` and the local cleanup ([ADR-0016](adr/0016-agent-reviews-and-merges-own-prs.md)).
- Sync PRs (`chore/standards-sync-*`) are reviewed and merged by the agent the same way, **except** in the 4 repos with `autoMergeSync: true` in `sync.config.json` (`shared-auth`, `shared-aws-infrastructure`, `file-control`, `develop-skill`). `scripts/sync.mjs` merges their sync PRs itself (merge commit) once CI is green, with no agent review ([ADR-0030](adr/0030-sync-prs-merge-themselves.md), #1105). It leaves the PR open for the agent when the branch has a commit that does not start with `chore: sync central standards (project-standards@`, when "Check before merging" has an item, or when CI is red or unreadable. This is the only exception to "no auto-merge"; shared-ai and the 8 apps stay on agent review.
- The agent does not merge while a check fails, when "Check before merging" has an item for the user, or in place of a review. It never force-pushes or pushes to main.

## Branch protection checklist

Set the following on each repo's main. The user makes the settings, and the compliance report (#22) checks them.

- [ ] No direct push to main: Require a pull request before merging
- [ ] CI must pass: Require status checks to pass (`ci`)
- [ ] No force push, no branch deletion
- [ ] Merge method: allow merge commits (same as the history so far)
- [ ] Automatically delete the branch after merge: Automatically delete head branches
