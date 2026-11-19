# #705 Generate registry files for shared-ai and Terraform

## Change

| File | Content |
|---|---|
| `scripts/lib/generated.mjs` | New. `apps-ts` renders `REGISTRY_APPS` (every active app and its API port); `apps-json` renders `apps`, `sharedServices` and `secretApps` |
| `scripts/lib/sync-plan.mjs` | A target's `generatedFiles` are added to its plan as managed (`full`) files; `neverTouchExcept` lets one path through a profile's `neverTouch` |
| `sync.config.json`, `sync.config.schema.json` | shared-ai gets `backend/src/apps.generated.ts`; shared-aws-infrastructure gets `apps.json`. The service profile allows `backend/src/apps.generated.ts` in `neverTouchExcept` |
| `scripts/test/generated.test.mjs`, `scripts/test/fixtures/sync-snapshot.json` | Tests and the two new snapshot entries |

## Decisions

- The files are generated per target, not per profile: a profile-level file would also reach shared-auth, which the sync tests require to receive no backend source.
- No `neverTouch` change is needed for the infra repo: `apps.json` matches none of its patterns (`*.tf`, `*.tfvars`, `*.sh`, the lock file). Only the service profile needed an exception.
- `apps.json` has a `generated` note field because JSON has no comments.

## Follow-ups (in the downstream repos, blocked until the sync PRs land)

- sirloinbh/shared-ai#11: import `REGISTRY_APPS` in `apps.ts`.
- sirloinbh/shared-aws-infrastructure#68: read `apps.json` in `dns.tf` and `secrets.tf`; the plan must show no change.

## Checks

- `npm run sync:preview` shows both files with the 8 apps.
- `npm run check` result is in the PR.
