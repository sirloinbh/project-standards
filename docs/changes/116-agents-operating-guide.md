# #116 Turn the central AGENTS.md into operating instructions (part)

Of the two tasks in #116, we did "AGENTS.md: verification commands, sync and deploy procedure, prohibited actions" first, because it does not depend on user steps or #115. "Regular compliance runs" already has a daily schedule (cron) in `compliance.yml` and works once the GitHub App variable (`SYNC_APP_ID`, #86) exists, so the first report PR and the check of the 9 repos come after #115.

## Change

| File | Content |
|---|---|
| `AGENTS.md` | Changed "Current phase: before design" to "preparing rollout". Added sections for verification commands, a source and copy table, sync and deploy, and prohibited actions. Wrote both the new tool location (#21) and the old one. Changed the phrase "until the sync script exists" to "the sync script only updates downstream repos" |
| `README.md` | Aligned the first sentence of "Current status" with AGENTS.md |

## Checks

- Compared this repo's `.claude/skills/` and `.github/` templates with the `templates/common/` sources (excluding the header). No differing files.
- Confirmed that the paths AGENTS.md points to exist (`templates/*`, the `*/v*` tags in `publish.yml`, `docs/dependency-policy.md`, `docs/agent-guardrails.md`).
- `npm run check` passed (all 392 tests passed).
