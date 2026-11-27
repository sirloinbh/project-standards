# #1163 Add design-system to the sync targets, registry and compliance report

Epic #1154. The `sirloinbh/design-system` repository (ADR-0031) joins the central standards.

## Change

| File | Content |
|---|---|
| `sync.config.json` | New profile `design-system` (`common` folder, the three shared lint, format and TypeScript packages, no app templates, no `neverTouch`). New target `sirloinbh/design-system` in wave 1, before the apps. Not `autoMergeSync`, so the agent reviews its sync PRs |
| `registry/projects.json` | `localTools` entry slot 12, web port 8112 (Storybook dev server). No subdomain until #1187 |
| `docs/projects.md` | Regenerated |
| `scripts/test/fixtures/sync-snapshot.json` | The files design-system receives (`UPDATE_SNAPSHOT=1 npm test`) |
| `scripts/test/*.test.mjs` | 14 targets; wave 1 is workout-memo, design-system, file-control; new tests for the profile and the registry slot |

## Notes

- The compliance report and the daily repo-settings baseline read `sync.config.json` targets, so design-system is covered with no script change.
- `design-tokens` is not in the profile: access for design-system is a user step (#1165). The profile gains it when the tokens move.
- The profile has no `ci` key, like `utility`: the repository keeps its own `check` workflow.

## Needs the user

Adding a sync target is the user's call (AGENTS.md). The PR waits for the user's OK before merging.

## Checks

`UPDATE_SNAPSHOT=1 npm test`, `npm run docs`, `npm run check`: passed.
