# #116 Finish the full rollout (operating instructions)

This is the last step (7) of design.md "12. Phased rollout plan". The sync of the 8 apps (#97, #98, #113, #114) and the infrastructure repo sync PR (#115) are done.

## Change

| File | Content |
|---|---|
| `AGENTS.md` | Changed "Current phase" to the operation phase: the order for changing a standard, the rule to stop the central merge when a commit is added directly to a sync PR (lesson from #114), and handling of the compliance report PR. Matched the app deploy description to the real state (only workout-memo is on the server). Stated that the old tools folder is no longer used |
| `README.md` | Changed "Current status" to the operation phase and added a link to the compliance report |

## Decisions

- The daily run of `compliance.yml` (00:00 KST) is already on, and the 10-24 and 10-25 runs succeeded. We did not change the workflow; we ran it once manually to reflect the result of this rollout.
- Deleting the old folder `%LOCALAPPDATA%\gh-workout-memo` stays a user step (docs/tools.md step 6).

## Verification

- `npm run check`: passed (412 of 413 tests passed, 1 skipped, 0 failed)
- Manual compliance run (central `519222e`): all 9 repos appear in the table, and the 8 apps are ✓ for sync, managed files, and shared packages. The infrastructure repo is waiting for its sync PR (shared-aws-infrastructure#5) to be merged.
