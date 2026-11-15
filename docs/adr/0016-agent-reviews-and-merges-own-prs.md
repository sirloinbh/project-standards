# 0016. The agent reviews its own PRs and merges them in every repo

- Status: Accepted (issue #591)
- Date: 2026-11-15
- Builds on: the central auto-merge decision of 2026-10-22 (#128, `docs/changes/128-central-auto-merge.md`) and the per-repo `autoMerge` table (#184). Those records are not rewritten; this ADR replaces their "only the user merges downstream repos" part.

## Context

- Until now only `project-standards` was merged by the agent. Downstream repos defaulted to "only the user merges" unless their own `AGENTS.project.md` said otherwise, and 7 app repos had `autoMerge: false`.
- Waiting for the user to merge every PR stalls each worktree, and the user checks the same things the agent can check.

## Decision

User decision, 2026-11-15, for every sirloinbh repo, including infra repos and app repos where merging `main` is a production deploy:

1. The agent reviews its own PR 1 or 2 times (more only while blocking findings remain) and fixes findings on the same branch between rounds ([std-code-review](../../templates/common/skills/std-code-review/SKILL.md) section 8).
2. A big problem outside the PR's scope becomes a new issue (std-backlog labels, priority, parent epic link), not a bigger PR.
3. After the review passes and CI is green, the agent merges with `pr merge --merge` (never `--delete-branch`, never squash) and does the local cleanup from std-git-writing.

Guards that stay:

- Required checks must be green on the final head.
- If "Check before merging" lists an item that needs the user's own decision, the agent asks and does not merge.
- No force-push and no direct push to `main`.
- Merging is not applying: `terraform apply`, server changes, and other real AWS or production changes still need the user's OK.
- A repo's own `AGENTS.md` or `AGENTS.project.md` may add stricter rules, which win.

## Consequences

- The `autoMerge` default is `true` for every repo (`docs/tools.md`). `tools/agents` code is unchanged.
- Merging an app repo to `main` can deploy it. The PR body must say so, and the review is the last check before that happens.
- Downstream repos whose own (non-synced) instructions or `.agents.json` still say "only the user merges" are not changed by sync. They are listed in one tracking issue.
