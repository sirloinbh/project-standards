# #401 Add stock quantity, foreign currency, and exchange rate rules to the domain rules

## Change

| File | Content |
|---|---|
| `docs/conventions/domain.md` | Added a "Foreign currency, quantity, and exchange rate" subsection to the amount section. Deleted the last line "decide in money-ledger when needed", and narrowed the first line to "KRW amounts are integers in won" |

## Decisions

- The rules were carried over from "quantity, foreign currency, exchange rate" in money-ledger `AGENTS.project.md` (sirloinbh/money-ledger#35, user decision on 2026-11-03). No new rules were made.
- Only the common rules (format table, calculation, rounding, totals) were carried over, so other apps can read them. The per-column `CHECK` conditions and the trade row layout point to the money-ledger source.
- The source and frequency of prices and exchange rates can differ per app, so money-ledger `docs/price-source.md` (#36) is mentioned only as an example.
- `docs/conventions/` is not synced to downstream repos, so no sync PR is created.

## Checks

- `npm run check` passed.
