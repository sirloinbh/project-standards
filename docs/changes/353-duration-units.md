# #353 Add the duration basis for seconds and months to the domain rules

## Change

| File | Content |
|---|---|
| `docs/conventions/domain.md` | Added the conditions for using seconds and calendar months and the rule for adding months, and linked them from the format table |

## Decisions

- Minutes are the default, and seconds or calendar months are used only when the unit of an external source or official rule is different.
- Even if an app does not open an issue centrally as it does now, it can use that unit if it meets these conditions.
- The conditions match the two exceptions in the cert-manager design document (`duration_seconds`, `validity_months`). There is no code change.

## Checks

- `npm run check` passed.
- The end-of-month adjustment example carries over the PostgreSQL behavior written in the issue, and was not run on a real DB.
