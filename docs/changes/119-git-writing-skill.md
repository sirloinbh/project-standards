# #119 Skill for writing issues and PRs, and merging issues

## Change

| File | Content |
|---|---|
| `templates/common/skills/std-git-writing/SKILL.md` | New common skill. Rules, with good and bad examples, for writing issue titles and bodies, branch names, commit messages, and PR titles and bodies so a person can read them easily |
| `templates/common/.github/ISSUE_TEMPLATE/task.md` | Issue template: one-line summary, why it is needed, tasks, done criteria, what must finish first, references |
| `templates/common/.github/pull_request_template.md` | PR template: what changed, why, main changes, what was verified, check before merging, impact |
| `templates/common/skills/std-backlog/SKILL.md` | Changed the splitting rule: group by "one purpose a single PR can review", track repeated work across repos in one tracking issue, and group user steps that happen at the same time. Issue bodies follow std-git-writing |
| `.claude/skills/std-*/`, `.github/ISSUE_TEMPLATE/task.md`, `.github/pull_request_template.md` | Copies used directly in the central repo |
| `AGENTS.md` | References to the two skills and the templates |

Inside the skill, the template location is written as "`.github/...` at the repo root" instead of a link. The same skill file sits in two places, `skills/` and `.claude/skills/`, at different folder depths, so one relative link cannot be correct for both.

## GitHub issue cleanup (changes outside the repo)

- Merged the 113 open task issues (#5–#117) into 44. The issues we kept were rewritten with the new template, and the merged numbers are listed under "References".
- The 69 merged issues got a comment saying which issue they were merged into, and were closed as `not planned`.
- Grouping criteria:
  - Files, checks, and docs with the same purpose → one issue (for example, the 6 registry files → #44)
  - Research that only needs confirming before implementation → the first task of the implementation issue
  - Work repeated across the 7 apps → one tracking issue (#99)
  - User steps → grouped by the same point in time (#86, #88)
- #1, #3, #118, and #119, which were in progress, are linked to their own PRs, so we left them as they were.

## Verification

- Compared the sources and copies of the two skills and the templates with `diff` (no differences).
- Confirmed that the relative links inside the skills point to real files from both the source and the copy locations.
- Before running, the issue cleanup script was checked with a dry run for these: every open issue is either kept or merged, every prerequisite issue number points to a kept issue, and no issue lists itself as a prerequisite.
- After running, queried the number of open issues and the label rule (one priority and one type label each) again (results are in the PR body).
