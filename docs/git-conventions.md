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
| The 8 app repos | The user only | Merging to main is a production deploy |
| shared-aws-infrastructure | The user only | Infrastructure changes need a plan review |

- Sync PRs (`chore/standards-sync-*`) are also merged by the user in app and infrastructure repos.
- The agent does not approve its own PR as a substitute for review.

## Branch protection checklist

Set the following on each repo's main. The user makes the settings, and the compliance report (#22) checks them.

- [ ] No direct push to main: Require a pull request before merging
- [ ] CI must pass: Require status checks to pass (`ci`)
- [ ] No force push, no branch deletion
- [ ] Merge method: allow merge commits (same as the history so far)
- [ ] Automatically delete the branch after merge: Automatically delete head branches
