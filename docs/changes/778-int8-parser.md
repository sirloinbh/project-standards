# #778 A checked int8 parser in standard/db.ts

## Change

- `templates/app/backend/src/standard/db.ts`: `setInt8Parser(types)` sets pg's int8 parser (type 20) to return a number and to throw above `Number.MAX_SAFE_INTEGER` (and below its negative). It takes pg's `types` as a parameter, like `createPool` takes the Pool, so the file still imports no value from `pg`.
- `scaffold/app/backend/src/app.ts` calls it next to the date parser.
- `templates/app/backend/src/standard/http.ts`: the `parseId` comment links ADR-0025 and `docs/conventions/pg-ids-and-rows.md`.
- `scripts/test/backend-db.test.mjs`: a safe value, the sign, `2^53`, `2^63 - 1`.

## Reason

ADR-0025 (#692): ids are numbers on the wire. Only study-log (checked) and life-journal (plain `Number`) had a parser; the other apps convert by hand.

## Follow-up

- Apps call `setInt8Parser(types)` where they set their other type parsers, then drop their `id::text` and `Number(row.id)` conversions (#779).

## Verification

- `node --test scripts/test/backend-db.test.mjs`: 7 pass. The scaffold starts with the parser set (`health.test.ts` and `openapi.test.ts` load `app.ts`). `npm run check`: see the PR.
