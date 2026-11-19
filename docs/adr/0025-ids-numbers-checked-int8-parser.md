# 0025. Ids are numbers on the wire; one checked int8 parser; SQL aliases for rows

- Status: Accepted (issue #692, parent #712; user decision relayed 2026-11-19: option A)
- Date: 2026-11-19
- Builds on: the architecture review of 2026-11-18 (cert-manager X7, dev-career-portfolio X7, plan-routine X7, health-log H8).
- Convention: [conventions/pg-ids-and-rows.md](../conventions/pg-ids-and-rows.md).

## Context

Survey of the 8 apps on 2026-11-19:

- `standard/http.ts` `parseId` returns a number and `ID_PATTERN` allows at most 15 digits, so every id it accepts is exact as a JS number.
- Ids go out as **numbers** in 6 apps: workout-memo (int4); study-log and life-journal (a global int8 parser); health-log and money-ledger (`Number(row.id)` per row); cert-manager (`id::text` in SQL, then `toId()` 19 times). They go out as **strings** in 2 apps: plan-routine (9 `id::text` casts, zod `^\d{1,18}$`, which allows ids above 2^53) and dev-career-portfolio (`id::text`).
- A global int8 type parser exists only in study-log (throws above 2^53) and life-journal (plain `Number`, no check). Without one, pg returns int8 as a string, which the other apps convert by hand.
- Rows map three ways: camelCase SQL aliases (study-log, life-journal, cert-manager, plan-routine, dev-career-portfolio), hand-written Row types and mappers (health-log, money-ledger), raw rows (workout-memo).
- money-ledger keeps money amounts as strings (`amount::text`) on purpose, to avoid precision loss.

## Decision

1. **Ids are numbers on the wire.** A bigint id is a JSON number. This matches `parseId` and its 15-digit cap.
2. **One checked int8 parser**, set in `standard/db.ts` for every app: it converts int8 (type 20) to a number and **throws** when the value is above `Number.MAX_SAFE_INTEGER`, instead of silently rounding.
3. **Rows map with SQL aliases**: `SELECT created_at AS "createdAt"`. No `id::text` casts for ids, and no hand-written Row types and mappers for plain columns. A mapper is still fine for a computed or nested value.
4. **Money and other `numeric` values stay strings** (`amount::text`, or pg's default for numeric 1700). Do not add a global numeric parser; a number loses precision.
5. plan-routine and dev-career-portfolio switch from string ids to number ids. This is a client-facing contract change in those two apps, so it is a separate follow-up issue each that the user can schedule or skip until then.

## Options considered

- **A (chosen):** numbers plus a checked global parser. Cheapest and closest to what 6 of 8 apps and `parseId` already do.
- **B:** string ids everywhere. Safest for precision but touches about 6 apps and all frontends, redefines `parseId` and `ID_PATTERN`, and adds about 100 casts.
- **C:** A, with the two string-id apps kept as a documented exception. Cheapest, but leaves two styles.

## Consequences

- cert-manager drops its 19 `id::text` casts and `toId`; health-log and money-ledger drop their `Number(row.id)` calls (after the shared parser lands).
- plan-routine and dev-career-portfolio change their id type: their frontends, OpenAPI and tests change with it.
- A row id above 2^53 makes the query fail loudly. At the cap of 15 digits that is far beyond any real table here.

## Revisit when

- A table could realistically pass 2^53 rows, or an id must be shown to a client that cannot hold a number safely. Then switch that table to string ids on purpose.

## Follow-up issues

- #778 the checked int8 parser in `standard/db.ts` (lane-2).
- #779 cert-manager, health-log, money-ledger, study-log, life-journal drop casts and conversions.
- #780 plan-routine and #781 dev-career-portfolio switch to number ids (the user may schedule or skip them).
