# 0030. Sync PRs merge themselves in 4 repos

- Status: Accepted (issue #1105, parent #1104; user decision 2026-11-26: option (b))
- Date: 2026-11-26
- Builds on: [ADR-0016](0016-agent-reviews-and-merges-own-prs.md) (agent reviews and merges its own PRs), [ADR-0029](0029-standards-delivery-per-repo-group.md) (delivery per repo group).

## Context

Every central merge opens or updates a sync PR (`chore/standards-sync-*`) in each target. In `shared-auth`, `shared-aws-infrastructure`, `file-control`, and `develop-skill`, the PR carries managed files that were already reviewed here, and merging it deploys nothing (`terraform apply` and server deploys still need the user). The agent review of each of these PRs is routine work. The std-backlog and std-code-review rule "do not enable auto-merge" blocked an automatic path.

## Decision

1. **Mechanism (b):** `scripts/sync.mjs` merges the sync PR itself with the sync App token (merge commit, `sha` pinned to the head it checked) after `waitForChecks` reports green. GitHub's native auto-merge is not used, so no repo setting changes are needed.
2. **Opt-in per target:** `"autoMergeSync": true` in `sync.config.json` (schema-validated). Set on exactly the 4 repos above. `shared-ai` and the 8 apps never opt in: a merge there can deploy.
3. **Skips (the PR stays open for the agent, with a `::warning::`):** a commit on the branch that does not start with `chore: sync central standards (project-standards@` (#114, #367); an item under "Check before merging" in the PR body; red, timed-out, or unreadable CI; a PR that is not open; a merge GitHub refuses.
4. **Rules:** std-backlog, std-code-review, `docs/git-conventions.md`, and `AGENTS.md` name these 4 repos as the only exception to "no auto-merge".
5. **Permissions:** Pull requests: write and Contents: write (already granted) merge the PR. Checks: read is also needed (#1055). Until it is granted, the merge step skips every PR with a warning, so nothing merges unreviewed.

## Consequences

- No agent action is needed for sync PRs in these 4 repos unless `sync.mjs` leaves one open.
- A bad central change reaches these repos without a second review. The central PR review, the wave gate (#1055), and each repo's own CI are the safeguards. Merging is not applying.
- Opting a repo in or out is a config change that needs the user's OK.
