# #591 The agent reviews its own PRs and merges them in every repo

## Change

| File | Content |
|---|---|
| `templates/common/skills/std-code-review/SKILL.md` | New section 8: review loop (1 or 2 rounds), fix on the same branch, new issue for big problems outside the PR, merge with `--merge` and clean up; guards |
| `templates/common/skills/std-implementation/SKILL.md` | Section 5 now "Review and merge"; production and AWS changes (not merges) are what needs the user |
| `templates/common/skills/std-backlog/SKILL.md` | The agent merges in every repo; new-issue rule for review findings |
| `templates/common/skills/std-git-writing/SKILL.md` | Merge rule line follows the new decision |
| `templates/app/AGENTS.md.tmpl`, `scripts/test/agents.test.mjs` | App procedure step 5 and its test |
| `scaffold/app/AGENTS.project.md` | Review wording follows section 8 |
| `AGENTS.md`, `README.md`, `docs/stack.md`, `.claude/rules/sync-and-deploy.md` | The agent merges downstream and sync PRs after review and green CI |
| `docs/tools.md` | `autoMerge` is `true` for all repos |
| `docs/adr/0016-agent-reviews-and-merges-own-prs.md` | The decision record |
| `.claude/skills/`, `plugins/sirloinbh-standards/` | Copies refreshed from the sources |

## Why

User decision, 2026-11-15: the agent reviews its own PR in a loop, files issues for big problems, and merges it, in all repos including infra and app repos. Old records (#128, #184, #147) are history and are not rewritten.

## Choices made without asking

- Chose to also let the agent merge the bot's sync PRs after review and green CI, because the decision covers every PR in every repo. Say so if you want sync PRs left to you.
- Chose to link this under a new parent #590 because no open epic covered agent workflow rules.

## Verification

- `npm run check`: see the PR.

## Limits and follow-up

- `tools/agents` code is unchanged (the default was already `true`).
- Downstream repos with their own "only the user merges" text or `.agents.json` `false` are in the tracking issue.

## Review round 1 (self-review)

- `todo:` `docs/git-conventions.md` merge policy table still said "user only" for app and infra repos. Fixed (with `docs/project-rename.md`).
- Left as is: `docs/design.md` phased plan and `docs/dependency-policy.md` (Dependabot PRs), which are history or outside this decision.
