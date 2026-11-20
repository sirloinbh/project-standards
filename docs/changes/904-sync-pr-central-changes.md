# #904 Sync PR body lists the central changes it carries

## Change

| File | Content |
|---|---|
| `scripts/lib/sync-pr.mjs` | `centralChanges(root, fromSha, toSha)` reads the first-parent history of the central checkout and returns the merged central PRs (`{ number, title }`, oldest first; a direct commit has number null). `renderBody` prints them under `## Why` (at most 15, then "and N more"). `syncTarget` uses the target's manifest `centralSha` as the start; a first sync, an unknown commit or no git history leaves the section out |
| `scripts/test/sync-pr.test.mjs` | A temporary git repo with merge commits for the helper, the 15-line cap, and the first-sync case |
| `docs/design.md` | The PR body description and the "merged again while a sync PR is open" rule mention the list |

## Why

Measured on the 48 sync PRs of 2026-11-20: one open sync PR per repo is updated in place, a SHA-only change proposes nothing, and no PR opened for a repo a change did not touch, so PRs do not pile up. What was missing: a PR carrying several central merges named only the newest commit, so the reviewer could not tell which central issues it covered or where to record the merge.

## Measured and not filed

Skipping the redeploy of a sync PR that carries no runtime file (only workflow, dependabot or `.standards` files) would have applied to 4 of 40 app sync PRs merged that day, so it is not worth a change.

## Checks

- `npm run check`: see the PR.
