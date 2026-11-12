# #404 Add the rule for grouping issue cards under per-area parent issues and sub-issues

The user asked for this on 2026-11-05. The way 35 open work issues in sirloinbh/file-control were grouped as GitHub sub-issues under 7 per-area parent issues is applied to all repos.

## Change

| File | Content |
|---|---|
| `templates/common/skills/std-backlog/SKILL.md` | Added rule 5 and chapter 6. Chapter 6 holds the parent and sub-issue rules and the link commands. Added the `epic` label in chapter 3, a "parent issue" line in chapter 4, and "a parent issue is not a candidate" and "link an unlinked issue before starting" in chapter 5 |
| `templates/common/skills/std-git-writing/SKILL.md` | Parent issue title rule, and parent issue in the body's "Notes" |
| `templates/common/.github/ISSUE_TEMPLATE/task.md` | Added a `Parent issue:` line to "Notes" |
| `templates/common/labels.json` | `epic` label (the sync creates it in downstream repos) |
| `.claude/skills/std-backlog/`, `.claude/skills/std-git-writing/`, `.github/ISSUE_TEMPLATE/task.md` | This repo's copies |

## Decisions

- An area is a unit of feature area, command, or module. Issues are not grouped by priority, type, or timing (labels do that).
- The depth is 2 levels (parent to task). A task issue has exactly one parent.
- A parent issue's priority is the highest level among its open sub-issues.
- A parent issue is not a candidate for the next task.
- A closed feature issue is not reopened for follow-up work outside its goal. It is linked to the open parent issue of that area.
- The multi-repo tracking issues (checkboxes) in the central repo are not parent issues.
- Existing open issues are grouped once, when each repo first uses this rule. This PR does not change existing issues in downstream repos directly.
- The link commands (`sub_issues` POST, `replace_parent`, `sub_issue` DELETE, `parent` check) were checked in file-control#120 by actually moving, detaching, and reattaching.

## Checks

- `npm run check`: the result is written in the PR body.
