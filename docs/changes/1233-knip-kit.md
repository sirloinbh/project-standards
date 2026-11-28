# #1233 knip skips the delivered UI kit, and the release check runs knip

- Issue: [#1233](https://github.com/sirloinbh/project-standards/issues/1233)
- Branch: `fix/1233-knip-kit`
- Related: #263 (knip in app CI), #1173 (release check), #1220 (format and lint in the release check)

## Cause

The design-system 1.0.2 sync (run 46139621064) stopped at wave 2: health-log, life-journal, money-ledger and cert-manager (`features.knipStrict`) failed `ci / verify` at `npm run knip`. knip reported kit exports that those apps do not use, such as `ChartTable`, `twelveWeeks`, `ListToolbarFilter`, `NavTabItem`, `SearchNavItem` and `ToggleChipOption`. The kit is central code with a public API, so an unused export in it is not an app finding. `knip.json` only skipped `frontend/src/components/ui/**`, and `design-system-release-check` did not run knip, so the pin PR passed.

## Changes - 2026-11-28

- `scripts/lib/sync-plan.mjs`: when a target receives `knip.json`, its `ignore` array gets the kit code files the target receives (source `templates/ui/` or `design-system/delivery/ui/`): one `frontend/src/components/<name>/**` per kit component folder, and the exact path for other kit code files (`sign-in.tsx`, `lib/*.ts`). Entries go one per line after the template's entries, so the apps' Prettier check keeps passing; entries the template already covers are left out. The list follows each release, so a new kit folder needs no template change.
- `scripts/release-app-check.mjs`: apps with `features.knipStrict` also run `npm run knip` (last step).
- `scripts/test/knip.test.mjs`, `scripts/test/release-app-check.test.mjs`: tests for both.

## Verification

- `node --test scripts/test/knip.test.mjs scripts/test/release-app-check.test.mjs`: 14 pass.
- `npm run check`: see the PR.
