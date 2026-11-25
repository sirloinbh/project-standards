# #1105 Sync PRs merge themselves in 4 repos

- Issue: [#1105](https://github.com/sirloinbh/project-standards/issues/1105)
- Branch: `feat/1105-auto-merge-sync-prs`
- Parent: #1104 Hands-off sync PR merging
- ADR: [0030](../adr/0030-sync-prs-merge-themselves.md)

## Changes — 2026-11-26

- `scripts/lib/sync-merge.mjs` (new): `autoMergeSyncPr` checks the PR is open, has no "Check before merging" item and no hand-added commit, waits for green checks, then merges with a merge commit pinned to the head SHA. Every skip is a workflow warning.
- `scripts/sync.mjs`: after the waves, merges the sync PR of each opted-in target that was opened or updated. `scripts/lib/sync-pr.mjs` returns the PR number.
- `sync.config.json` and its schema: `autoMergeSync` on `shared-auth`, `shared-aws-infrastructure`, `file-control`, `develop-skill`.
- `scripts/test/sync-merge.test.mjs`: merge, direct-commit skip, "Check before merging" skip, red CI, missing Checks permission, refused merge, opt-in list, and `apply` merging only opted-in targets.
- std-backlog and std-code-review (source and `.claude/` copies), `docs/git-conventions.md`, `AGENTS.md`, `docs/design.md`, `docs/github-app.md`, `.claude/rules/sync-and-deploy.md`: name the exception.

## User step

Grant the sync App Checks: read-only (already tracked in `docs/github-app.md`). Until then the merge step warns and merges nothing. "Done when" item 2 (the next central merge merges the 4 sync PRs) is verified after that.

## Verification

- `npm run check` passes (see the PR).
