# #22 Repo settings and secret name check

## Change

| File | Content |
|---|---|
| `scripts/lib/repo-settings.mjs` | Reads repo settings, branch protection, Dependabot, Actions permissions, and secret and variable **names**, and compares them with the baseline. A GitHub Free plan limit (403) on private repos is classified as "plan" |
| `scripts/compliance.mjs`, `scripts/lib/compliance.mjs` | A "repo settings" column in the compliance status, and a per-repo table of differing items |
| `sync.config.schema.json` | Per-target `secrets` and `variables` name lists (optional, default empty list) |
| `docs/repo-settings.md` | Items, baseline, level, reason, 2026-10-22 results, and the commands to fix them |
| `docs/user-steps.md` | Step 5: align repo settings |
| `scripts/test/repo-settings.test.mjs` | Baseline met, plan limit, no protection, missing name, read failure, and values never appear in the report |

## Decisions

- The secret and variable lists live in the `sync.config.json` targets, not in the registry projects, because some targets, such as the infrastructure repo, are not projects.
- Branch protection and secret scanning on private repos are not available on GitHub Free, so they are not counted as failures.
- Disabling squash and rebase and automatic branch deletion are recommended (△).

## Checks

- `npm run check` passed.
- Ran ahead of time against the 9 repos with the personal-account read API: see "2026-10-22 results" in `docs/repo-settings.md`.
