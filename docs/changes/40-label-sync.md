# #40 Sync issue labels to downstream repos

## Change

| File | Content |
|---|---|
| `templates/common/labels.json` | Name, color, and description of the 20 std-backlog labels (5 `priority/*`, 5 `type/*`, 8 `area/*`, `needs-user`, `origin/added`). Built by exporting the central repo labels of 2026-10-22 with `label list --json` |
| `templates/index.json`, `scripts/lib/templates.mjs` | A `data` list. Files listed there (`common/labels.json`) are not copied to target repos as files |
| `scripts/lib/labels.mjs` | Validates the label list, compares it with the target repo labels (create, update, unchanged, unmanaged), and calls the create and update APIs |
| `scripts/sync.mjs` | `--apply` aligns labels after the sync PR. `--dry-run --labels-from <repo>=<file>` previews label changes |
| `scripts/test/labels.test.mjs`, `fake-github.mjs` | Added a label API to the fake GitHub, and 8 tests |
| `docs/adr/0002-github-app-for-sync.md`, `docs/github-app.md`, `docs/user-steps.md` | Added Issues write to the App permissions. User step 6 |

## Decisions

- **Labels included:** only the labels the std-backlog skill defines. The GitHub default labels (`bug`, `enhancement`, and others that the 9 repos already have) are not included. `area/*` are names based on the central repo, but the skill says to use the same list in every repo, so they are included as is.
- **Never delete:** labels not in `labels.json` are only reported as "unmanaged" and are not deleted, because deleting would remove the label from the issues that carry it.
- **Name case:** GitHub label names are case-insensitive. If `Priority/P1` exists, it is not created again; its name is corrected to `priority/P1`. Color case differences are not treated as changes.
- **Failure handling:** a label failure (for example 403 without Issues permission) is recorded as `labelsError`, separately from the sync PR result. The PR still opens, and the workflow ends as failed so it is noticed.
- **Scope of execution:** applies only to the same `maxRollout` targets as the file sync. With `maxRollout` at 0 now, no repo's labels change.
- **Preview:** the existing dry-run does not use the network, so the target repo labels are supplied from a file the user exports (step 5 of `docs/github-app.md`).

## Checks

- `node --test scripts/test/labels.test.mjs`: 8 passed
  - All labels written in the skill exist and no other labels exist
  - `labels.json` is not included as a file in the plans of the 9 targets
  - Invalid colors, long descriptions, and duplicate names are rejected
  - Distinguishes create, update, unchanged, and unmanaged (name case, color case, no description)
  - A dry run makes no write calls; running again after a real run makes no writes; no DELETE calls; unmanaged labels are kept
  - With 150 or more labels, it reads up to the second page
  - `apply` creates the target repo labels, and on 403 keeps the PR result and records `labelsError`
  - The dry-run CLI `--labels-from` (file with a BOM) writes the plan to `plan.json` and the console
- `npm run check`: passed (173 of 174 tests passed, 1 skipped, 0 failed, `check-workflows: ok (8 files)`)
- It was not run against real repos. After the Issues permission is added to the App and `maxRollout` is raised, it will be verified in the `sync` run log.
