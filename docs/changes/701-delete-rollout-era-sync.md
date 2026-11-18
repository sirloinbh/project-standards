# #701 Delete rollout-era code from the sync

## Change

| File | Content |
|---|---|
| `scripts/lib/pin-ranges.mjs`, `pinPackageFiles` in `scripts/lib/sync-pr.mjs` | Removed. The sync no longer pins `^`/`~` ranges or edits lockfiles; no app has a range version |
| `scripts/standards-check.mjs` | New `version range` problem: a `^`/`~` version in `package.json`, `frontend/` or `backend/package.json` fails the check (`rangeVersions`) |
| `scripts/lib/sync-pr.mjs` | `OLD_COMMIT_PREFIX` removed. No open sync PR existed in the 11 target repos on 2026-11-19 |
| `sync.config.json`, schema, `sync.mjs`, `sync-plan.mjs`, `registry.mjs`, `gen-docs.mjs` | `maxRollout` and `rollout` replaced by an optional per-target `enabled: false`. `docs/projects.md` shows a `Synced` column instead of `Rollout stage` |
| `docs/design.md`, `docs/tools.md`, `tools/install.ps1`, `AGENTS.md`, `README.md`, `docs/github-app.md`, `docs/agent-guardrails.md`, `docs/user-steps.md`, `.claude/rules/` | Status refreshed; rollout and old-location wording updated |
| `templates/common/skills/std-git-writing/SKILL.md` (and copies via `npm run self`, `npm run plugin`) | Dropped the sentence about the old Korean bot prefix and the `maxRollout` example |

## Not changed

- `.github/workflows/sync.yml` line 1 still says "at or below maxRollout" in a comment (lane-4 owns workflows). Follow-up for that lane.
- `docs/design.md` section 12 keeps the original rollout plan as history.

## Checks

- Sync snapshot unchanged (`UPDATE_SNAPSHOT=1 npm test` wrote no diff).
- `npm run check` result is in the PR.
