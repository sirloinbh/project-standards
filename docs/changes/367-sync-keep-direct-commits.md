# #367 Stop the sync bot from overwriting commits added by people

## Change

| File | Content |
|---|---|
| `scripts/lib/sync-pr.mjs` | Checks the PR commits before updating the branch, and if there is a direct commit it leaves the branch alone and posts a comment on the PR |
| `scripts/sync.mjs` | Shows skipped repos as a workflow warning |
| `scripts/test/sync-pr.test.mjs`, `scripts/test/fake-github.mjs` | Tests for keeping, lookup failure, and post-merge behavior, and the fake API route |
| `AGENTS.md`, `docs/design.md` | Updated the rule and the sync flow |

## Decisions

- Bot commits are recognized by the start of the message (`chore: 중앙 표준 동기화 (project-standards@`, the legacy Korean sync commit prefix, kept as is because the code matches on it). It works even if the app account name changes.
- If the commit list cannot be read, that repo is treated as a failure and nothing is overwritten.
- It checks before creating commits and trees, so no unused objects are created in the downstream repo when skipping.
- App permissions are unchanged. Reading commits and posting PR comments work with the existing Pull requests permission.
- A skipped repo is in the `kept` state, not a failure, so it does not fail the workflow.

## Limits

- While that PR is open, central changes are not applied to that repo. After merging it, run the `sync` workflow.
- The behavior has not been seen in a real app repo yet. It was checked with fake API tests.
