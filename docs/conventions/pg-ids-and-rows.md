# Ids and row mapping for pg results

Decided in [ADR-0025](../adr/0025-ids-numbers-checked-int8-parser.md) (#692).

## Rules

1. **Ids are numbers on the wire.** A `BIGINT` or `INTEGER` id is a JSON number in every response and request. Path ids go through `parseId` in `standard/http.ts`, which returns a number and accepts at most 15 digits (`ID_PATTERN`).
2. **Do not cast ids to text in SQL.** No `id::text`, no `toId()` to turn it back.
3. **One checked int8 parser per app**, set once in `standard/db.ts` when the pool is created. pg returns int8 (type 20) as a string by default; the parser converts it to a number and **throws** when the value is above `Number.MAX_SAFE_INTEGER`. Do not use a plain `Number` parser: it rounds silently.
4. **Money and other `numeric` values stay strings.** Select them as `amount::text` (or let pg return numeric as a string) and send them as strings. Do not add a global numeric (type 1700) parser.
5. **Map rows with SQL aliases**: `SELECT created_at AS "createdAt", display_name AS "displayName"`. Do not write a Row type plus a mapper function per feature for plain columns. A mapper is fine for a computed or nested value (a joined list, a derived total).
6. **Dates**: keep each app's existing date parser (type 1082) as it is; this convention does not change it.

## Example

```ts
// backend/src/standard/db.ts (shared): runs once at startup
types.setTypeParser(20, (text) => {
  const value = Number(text);
  if (!Number.isSafeInteger(value)) throw new Error(`int8 value ${text} is above 2^53`);
  return value;
});

// a route
const { rows } = await pool.query('SELECT id, title, created_at AS "createdAt" FROM notes WHERE id = $1', [parseId(req.params.id, 'note')]);
res.json(rows[0]); // { id: 12, title: '...', createdAt: '...' }
```

## Adopting it in an app

- Remove `id::text` casts and `toId`/`Number(row.id)` conversions after the shared parser is in the app (health-log, money-ledger, cert-manager).
- An app whose API returns string ids today (plan-routine, dev-career-portfolio) changes its id type, OpenAPI and frontend together: a client-facing change, tracked in its own issue.
- Check with `grep -rn "id::text" backend/src`: it should find nothing.
