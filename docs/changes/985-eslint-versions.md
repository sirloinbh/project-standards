# #985 Raise eslint, typescript-eslint, @sirloinbh/eslint-config in versions.json

Part 2 of 2 (part 1: #1116, package 1.2.0 published).

## Change

- `versions.json`: `eslint` 10.15.0, `typescript-eslint` 8.73.0, `@sirloinbh/eslint-config` 1.2.0. The scaffold template, `docs/versions.md`, `docs/design.md`, `docs/conventions/code.md` and the sync test fixture follow.

## Why

Apps can then resolve `minimatch` 11 (GHSA-g3hv-75wg-m249). Package review and the 14-day waiver (user, 2026-11-26) are in [985-eslint-config-1-2-0.md](985-eslint-config-1-2-0.md).

## Verification

- `npm run check` passed.
- Real-app check (LANES rule 8): in a clean workout-memo clone, applied the three versions, `npm install --ignore-scripts`, `npm run lint` (max-warnings 0) and `npm run typecheck` passed. The clone was discarded.

## Follow-ups

- Each app sync PR needs a lockfile commit (not starting with `chore: sync central standards`).
- Apps with `eslint-plugin-jsx-a11y-x` 0.2.0 still need an npm `overrides` entry for `minimatch` ^11; in workout-memo `@lhci/cli` also pulls old minimatch, so the advisory may not fully clear there. Decide per app; consider a template override later.
