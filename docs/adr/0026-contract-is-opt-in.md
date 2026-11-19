# 0026. The shared contract is opt-in

- Status: Accepted (issue #693, parent #712; user decision relayed 2026-11-19: option A)
- Date: 2026-11-19
- Builds on: the architecture review of 2026-11-18 (M9, X1); [ADR-0022](0022-drop-subtree-sub-repos.md).

## Context

Survey of the 8 apps on 2026-11-19:

- `shared/contract.ts` holds real content in 2 apps only: workout-memo (561 lines, 5 backend and 16 frontend importers) and money-ledger (26 lines, 1 and 1 importers).
- The other 6 apps (study-log, health-log, life-journal, cert-manager, plan-routine, dev-career-portfolio) have the 8-line stub. Nothing imports it (life-journal: one backend import of `idSchema`), yet each carries `scripts/contract.mjs`, two copies, three knip ignores and a frontend `zod` dependency that nothing in `frontend/src` imports.
- The scaffold's `idSchema` is `z.coerce.number()`, which accepts `"1e3"`, `"0x10"` and `true`.
- The copy step (`contract:sync`) exists so `frontend/` and `backend/` each build alone: Docker contexts and the subtree repos. ADR-0022 removes both reasons.
- Enums are copied by hand in several apps (cert-manager, dev-career-portfolio, health-log, plan-routine, life-journal, money-ledger). That is a possible later use of a contract, not a reason to keep empty stubs.

## Decision

1. **The contract is opt-in** through `features.contract` in the registry. It stays on in workout-memo and money-ledger and is **off by default in the scaffold**.
2. The 6 stub apps lose the stub, both copies, the knip ignores and the unused frontend `zod` dependency, **one app at a time**. Removing the `zod` dependency is covered by this decision.
3. `idSchema` is tightened to a digit regex (`^\d+$`, up to 15 digits, positive) and keeps coercing the result to a number. It no longer accepts `"1e3"`, `"0x10"` or `true`.
4. After #770 (Docker builds from the repo root), the two apps that keep a contract **import `shared/` directly** and the copy step goes.
5. An app that later wants to share an enum between routes and screens turns the feature on and puts it in `shared/contract.ts`.

## Options considered

- **A (chosen):** opt-in, remove the dead stubs, tighten `idSchema`.
- **B:** fill the contract in every app plus a duplicate-enum check. Best de-duplication, most work (a migration PR per app), and the copy step stays.
- **C:** remove the mechanism everywhere. workout-memo would inline 561 lines into 21 importers: high risk.
- **D:** keep as is. No cost now, but 6 dead stubs stay.

## Consequences

- Six app PRs (each a production deploy on merge) remove files and a dependency. The sync stops managing `scripts/contract.mjs` for an app when its `features.contract` is turned off, so each app removal also edits its `package.json` scripts and `knip.json`.
- The scaffold change and the `idSchema` fix are central; the per-app removals and the direct-import switch are app work.

## Revisit when

- Two or more apps duplicate the same enum or schema and a contract would remove real drift. Then enable it for those apps.

## Follow-up issues

- #782 the scaffold turns the contract off by default and `idSchema` is tightened.
- #783 remove the stub from the 6 apps, one app at a time.
- #784 import `shared/` directly in workout-memo and money-ledger, after #770.
