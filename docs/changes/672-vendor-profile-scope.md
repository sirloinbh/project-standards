# #672 (part) Vendor the tool-token verifier files to shared-ai

Part of #672. shared-ai's tests can then verify signed tokens with the same `standard/tools.ts` the apps run, instead of a hand copy in `fake-app.ts`.

## Change

| File | Content |
|---|---|
| `scripts/lib/templates.mjs` | A `vendor.files` entry can be `{ from, profiles, repos? }`: it reaches only those profiles, and only those repos when `repos` is listed. A plain string still goes to every profile |
| `templates/index.json` | Vendors `templates/app/backend/src/standard/{tools,audit,db}.ts` to `backend/test/standard/` of shared-ai (profile `service`, repo `sirloinbh/shared-ai`). `tools.ts` imports `./audit.js` and `./db.js`, so all three go together (agreed with lane-7) |
| `sync.config.json` | `neverTouchExcept` of the `service` profile lists `backend/test/standard/*.ts` (the profile protects `backend/**`) |
| `scripts/test/templates.test.mjs`, `generated.test.mjs`, `fixtures/sync-snapshot.json` | The files reach shared-ai only, copied as they are with the managed header; the snapshot lists them |

## Decisions

- Limited to shared-ai with `repos`, not to the whole `service` profile, because the issue says "for shared-ai only" and shared-auth has no use for them (unused files could fail its knip).
- Copied verbatim from the app templates, so the fixture cannot drift from what apps run.

## Not in this PR

Deleting the hand copy in `shared-ai backend/test/fake-app.ts` is lane-7's follow-up in shared-ai, after the sync PR arrives. #672 stays open for that.

## Checks

- `UPDATE_SNAPSHOT=1 npm test`, then `npm run check`: see the PR.
