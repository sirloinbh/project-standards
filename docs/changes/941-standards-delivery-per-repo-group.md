# #941 Design which central standards reach each repo group

Docs only. No sync behavior changes in this PR.

## Change

| File | Content |
|---|---|
| `docs/adr/0029-standards-delivery-per-repo-group.md` | New ADR (Proposed): the 4 repo groups, a matrix of file families x groups (sync / do not sync / plugin only, with a reason), the decision to make the utilities sync targets with a `utility` profile and retire the plugin, 3 gaps found in the other groups, and 4 choices for the user |
| `docs/design.md` | Key-decision row for ADR-0029, a note that the 5.4 config block is the initial value, and a new section 5.5 with the per-group summary |

## How it was surveyed

- Read `sync.config.json`, `templates/index.json`, `scripts/lib/sync-plan.mjs`, `scripts/lib/templates.mjs`, `scripts/build-plugin.mjs`, `scripts/build-self.mjs`, ADR-0013, and the two utility repos' `main`.
- Computed the files each profile receives with `planTarget` at central commit `39c40af`: app (workout-memo) 217, infra 40, shared-auth 58, shared-ai 62. A trial profile with only the `common` folder rendered 38 files for `file-control` with no code change.

## Checks

- `npm run check:docs`: passed.
