# #184 Align the agent auto-merge default and the downstream repo merge confirmation rule

## Decision (user, 2026-10-23)

Keep the `autoMerge` default `true` in `.agents.json`, and turn it off with `false` only for repos that do not allow auto merge.

## Change

| File | Content |
|---|---|
| `AGENTS.md` | Added an exception to "Downstream repo PRs need user confirmation": a PR the worker opens follows `autoMerge` in that repo's `.agents.json` |
| `docs/tools.md` | A "Auto merge per repo" table (workout-memo `true`, the other 7 apps `false`, not applicable to the central and infrastructure repos), a warning that without the file it auto merges, and why it is not distributed by sync |
| `templates/app/AGENTS.md.tmpl` | One sentence about the worker exception in the app repo merge rule |

Decisions:

- **We do not change the code default.** `autoMerge: true` in `tools/agents/config.mjs` and its tests are unchanged.
- **`.agents.json` is not distributed by sync.** It holds values that differ per repo (`checkScript`, `database.tables`), and the sync `fields` mode does not create a file that does not exist (`fieldsPending` in `scripts/lib/sync-plan.mjs`). The table in `docs/tools.md` is the source of the per-repo values, and for a repo with `false`, `.agents.json` goes into the PR that introduces the worker.
- **Targets of `false`:** The app `AGENTS.md` says "merging to main is a production deploy", and the only decision that allowed auto merge was #128 (workout-memo), so we wrote `false` for the other 7 apps.

## Verification

- `npm run check` passed (all 392 tests passed, 0 skipped). The code and the sync snapshot did not change (only the path of the app `AGENTS.md`, not its content, is in the snapshot).
