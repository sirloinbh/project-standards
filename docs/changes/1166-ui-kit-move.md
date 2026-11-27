# #1166 Move the shared UI kit (templates/ui) to design-system

- Issue: [#1166](https://github.com/sirloinbh/project-standards/issues/1166)
- Branch: `feat/1166-ui-kit-equality`
- Related: sirloinbh/design-system#21 (the copy), [design-system-move.md](../design-system-move.md) rows A1 to A4, B4 and E1, #1170 (removes this copy), #1171 (delivery from design-system)

## Changes — 2026-11-28

The kit itself is copied in sirloinbh/design-system#21: `templates/ui/frontend/src` and `public` become `src/` and `public/` there, 90 files, byte for byte. Nothing under `templates/ui` changes here; #1170 removes it once sync delivers from design-system.

`scripts/compare-ui-kit.mjs <design-system checkout>` proves the move:

1. It copies this repository to a temporary folder and puts the design-system kit (the files git tracks under `src/` and `public/`, without stories) in place of `templates/ui/frontend`.
2. It plans every sync target whose project has `features.ui`, once from here and once from the temporary copy, and compares each file by hash. A file that differs, goes missing or is new is an error.
3. `STAYS` lists the three files that do not move: `src/sign-in.tsx` (private `@sirloinbh/auth-client`), `src/service-worker.ts` and its test (they need the app's PWA files). They keep their project-standards copy in the comparison.

`scripts/test/compare-ui-kit.test.mjs` covers it with a stand-in made from `templates/ui` (equal: no problems; a changed, missing and extra file: reported; `STAYS` files exist).

## Verification

- `node scripts/compare-ui-kit.mjs ../lane-2-apps/design-system` against design-system#21: `90 kit files render the same for 8 apps`.
- `node --test scripts/test/compare-ui-kit.test.mjs`: 3 passed. `npm run check`: passes (743 tests, 0 failed).
- The sync snapshot (`sync-snapshot.json`) is unchanged.
