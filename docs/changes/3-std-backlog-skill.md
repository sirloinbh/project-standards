# #3 Common skill std-backlog

## Change

- `templates/common/skills/std-backlog/SKILL.md`: the procedure for splitting requirements into small issues, registering them, adding priority and characteristic labels, and choosing the next task after the previous PR is merged. This is the source that option B sync distributes to every downstream repo.
- `.claude/skills/std-backlog/SKILL.md`: the copy that Claude Code reads in the central repo
- `AGENTS.md`: added a std-backlog reference to the work procedure (Codex finds the skill through this reference)

## GitHub settings (changes outside the repo)

I created 20 labels in sirloinbh/project-standards.

- Priority: `priority/P0` to `P4`
- Characteristic: `type/feature|docs|security|chore|research`, `area/templates|tooling|compliance|registry|scaffold|ci|deploy|agent`
- Other: `origin/added`, `needs-user`

This issue (#3) is a requirement added during the work, so I gave it `priority/P0` and `origin/added`. I gave #1 `priority/P1` and `type/docs`.

## Applying to downstream repos

Distribution to downstream repos goes through the `templates/common/skills/` path once the sync script exists. We do not push directly to downstream repos. Aligning the labels across the 9 repos is registered as a separate backlog issue.

## Checks

- I confirmed with `diff` that the source and the Claude Code copy are the same (no differences).
- I confirmed that the `name` in the skill frontmatter equals the directory name (`std-backlog`).
