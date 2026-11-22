# #783 Turn `features.contract` off for the six apps that drop the stub

## Change

- `registry/projects.json`: `features.contract` is `false` for study-log, health-log, life-journal, cert-manager, plan-routine and dev-career-portfolio. workout-memo and money-ledger keep `true`.

## Reason

ADR-0026 (#693): nothing imports the stub in these six apps. The flag only controls what the scaffold writes (#782); `scripts/contract.mjs` stays managed and is a no-op without `shared/contract.ts`, so no sync output changes. Each app then deletes its stub in its own PR (#783 tasks).

## Verification

`npm run check`: see the PR.

## Correction — 2026-11-22

The registry change above never landed: commit `0ae4a10` added only this record, and `registry/projects.json` still has `features.contract: true` for all eight apps (found in #978). health-log now uses a contract again and keeps `true` (sirloinbh/health-log#215). The five other apps are fixed in #986.
