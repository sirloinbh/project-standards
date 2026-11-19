# #692 and #693 Id convention and the shared contract

Two decisions of the user (relayed 2026-11-19, option A in both), written as ADRs after a read-only survey of the 8 apps.

| File | Change |
|---|---|
| `docs/adr/0025-ids-numbers-checked-int8-parser.md` | #692: ids are numbers on the wire; one checked int8 parser in `standard/db.ts`; SQL aliases for rows; numeric stays a string |
| `docs/conventions/pg-ids-and-rows.md` | The rules and how an app adopts them |
| `docs/adr/0026-contract-is-opt-in.md` | #693: the contract is opt-in (kept in workout-memo and money-ledger), the stubs and unused frontend `zod` go from 6 apps, `idSchema` gets a digit regex, direct `shared/` import after #770 |

Follow-up issues, all under #712: #778 to #784 (listed at the end of each ADR). No code changes here; implementation is lane-2's (backend template) and per-app work.

Check: `npm run check` result is in the PR.
