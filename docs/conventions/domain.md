# Shared domain rules (time zone, dates, amounts and units)

These are the data rules all 8 apps follow. Rules that differ per app (for example, workout-memo's "weight is the total weight including the machine's base weight") go in the "Service rules" section of each app's `AGENTS.project.md`. If you need to do something differently from this document, do not change it in the app; open an issue in the central repo.

Basis: the rule "dates are `YYYY-MM-DD`, the service time zone is `Asia/Seoul`" in the `AGENTS.md` of all 8 apps, the `date` schema in workout-memo `shared/contract.ts`, and `serviceDate()` in study-log `backend/src/app.ts`.

## Time zone

- The service time zone is `Asia/Seoul` (UTC+9, no daylight saving time). "Today", "this week", and "this month" are all calculated in this time zone.
- The server's today's date is calculated in one place, such as a `serviceDate()` function. It takes `now` as an argument so tests can supply the time.

  ```ts
  export const serviceTimeZone = 'Asia/Seoul';
  export function serviceDate(now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: serviceTimeZone }).format(now); // 2026-10-22
  }
  ```

- Do not use `new Date().toISOString().slice(0, 10)` for the current time. It is UTC-based, so between 00:00 and 08:59 Korean time it gives the previous day's date.
- Do not rely on the server's or container's `TZ` setting. The code specifies the time zone directly.

## Dates and times

| Kind | Storage (PostgreSQL) | API, URL, form value | Example |
|---|---|---|---|
| Date (one calendar day) | `date` | `YYYY-MM-DD` string | `2026-10-22` |
| Time of day (time within a day) | `time` | `HH:mm` 24-hour | `07:30` |
| Moment (when it happened) | `timestamptz` | ISO 8601, with offset | `2026-10-22T09:15:00.000Z` |
| Duration (length) | `integer` | Integer in minutes, with the unit in the name. For the exceptions of seconds and calendar months, see "Quantities and units" | `duration_minutes: 90` |

- Dates the user picks (the day of a workout, the day of study, a deadline) are stored as `date`. Do not store them as a moment (`timestamptz`) and truncate.
- Record moments such as `created_at` and `updated_at` are set as `timestamptz NOT NULL DEFAULT now()`.
- Date input is validated by the server and the screen with the same Zod schema. Check both the format (`YYYY-MM-DD`) and that the date really exists (reject February 30). Source example: `date` in workout-memo `shared/contract.ts`.
- Adding and subtracting dates is done by making UTC midnight with `date + 'T00:00:00Z'` and using `setUTCDate`. Do not mix in local-time methods (`setDate`, `getDay`).
- Range queries include both ends: `?from=2026-10-01&to=2026-10-22` includes both the 1st and the 22nd.
- A week starts on Sunday and ends on Saturday (user decision 2026-10-22, #39). The day where `getUTCDay()` is `0` is the first day of the week.
- If the end time is earlier than the start time, it is treated as crossing midnight (for example, `23:30`–`00:30` is 60 minutes). Basis: study-log `studyMinutes()`.

### On-screen display

- Stored values and API values stay in the formats above. Convert them only when showing them differently on screen.
- Dates on screen are written in English: `October 22, 2026`, `Thu, Oct 22`. Within one app, use the same format in the same place.
- If a date input needs a default, put in today's date in the service time zone.

## Amounts

- The default currency is the won (KRW). Won amounts are handled as integers in won. Do not calculate with decimals (`float`, `numeric(…,2)`). For foreign currency and stock quantities, follow "Foreign currency, quantity, and exchange rate" below.
- Storage uses `bigint`, because things like asset totals can exceed the `integer` range (about 2.1 billion).
- pg returns `bigint` as a string. When sending it through the API, check it with `Number.isSafeInteger` and then convert it to a number.
- The direction of income and expense is shown by a kind field (`kind: 'income' | 'expense'`), not by sign, and amounts are stored as 0 or more.
- On screen, add thousands separators and `원`: `12,500원`. Use `Intl.NumberFormat('ko-KR')`.

### Foreign currency, quantity, and exchange rate

Apps that handle stock quantities, foreign currency amounts, and exchange rates follow this. It carries over the rules money-ledger decided (user decision 2026-11-03, sirloinbh/money-ledger#35). The source with column names and even `CHECK` conditions is "Quantity, foreign currency, exchange rate" in money-ledger `AGENTS.project.md`.

| Value | Storage (PostgreSQL) | API value | Example |
|---|---|---|---|
| Currency code | `text`, only `KRW` and `USD` (`CHECK (currency IN ('KRW', 'USD'))`) | `'KRW' \| 'USD'` | `USD` |
| Quantity | `numeric(20,8)`, greater than `0` | Decimal string | `"0.12345678"` |
| Won amount | `bigint` (won) | Integer number | `175000` |
| Foreign amount and unit price | `numeric(20,4)` + `currency` in the same row | Decimal string | `"123.4500"` |
| Exchange rate | `numeric(12,4)`, won per 1 unit of foreign currency | Decimal string | `"1385.2500"` |

- When adding a currency, change the `currency` allow list and this table together. Open an issue in the central repo.
- A won amount is always `bigint`. For an amount that can be in either won or foreign currency, split it into two columns, `amount_krw bigint` and `amount_foreign numeric(20,4)`.
- `numeric` values are sent and received as strings in the API. Do not convert them to JavaScript `number` to calculate. Multiplication, totals, and rounding are done with SQL `numeric` operations. Input validation checks the integer and decimal digit counts with a Zod regex.
- A transaction stores the exchange rate of the transaction date together with the won-converted amount. Even if the rate changes later, the won amount of the transaction record does not change. Do not put an exchange rate on a won transaction (`NULL`).
- Valuation (current value) is converted to won with the latest exchange rate at query time. The app decides the sources and update frequency of prices and rates (money-ledger uses `docs/price-source.md`: the closing price fetched once a day and the Korea Eximbank base rate).
- Won conversion rounds only once, at the end: `round(quantity × unit price × exchange rate)`. Do not round intermediate results such as the total foreign amount first.
- Rounding is PostgreSQL `round(numeric)`, and 0.5 goes away from zero (`round(2.5) = 3`, `round(-2.5) = -3`). If `double precision` is mixed into the operands, it switches to round-half-even, so keep everything `numeric`. Do not substitute JS `Math.round`.
- Totals add won-converted amounts to each other. Do not add foreign amounts of different currencies directly.
- Foreign amounts to show on screen are produced in SQL as `round(…, 2)` (cents) and sent. Do not round on screen with `Number(...).toFixed()`.

## Quantities and units

- Use the metric system: weight `kg`, length `cm`, time `분` (minutes), calories `kcal`.
- A unit is fixed to one per field. Input screens do not accept other units (lb and so on).
- Make the unit visible in the field name (`duration_minutes`) or in the label or comment of the contract schema (`kg('총중량')`). If neither has it, the unit has to be guessed, so add it.
- Durations are in minutes by default. If the unit of external material or an official rule is seconds or calendar months, that unit may be used. It is still an `integer`, the name shows the unit (`duration_seconds`, `validity_months`), and the range is limited with `CHECK (… > 0)`. Basis: cert-manager's track length (LRCLIB and MusicBrainz use seconds and milliseconds) and certificate validity (official guidance says "2 years", "3 years").
- Calendar months are added to the date without converting to days. If the resulting month lacks the same day, it is set to the last day of that month. This is the same as PostgreSQL `date + interval`. Example: `2024-02-29` + 24 months = `2026-02-28`.
- Measurements that need decimals (weight, body weight, body fat percentage) are stored with fixed digits such as `numeric(7,2)`. Do not use `real` or `double precision`. Basis: `weight numeric(7,2)` in workout-memo `001_initial.sql`.
- Counts are `integer`, with the range limited by `CHECK (… > 0)` or `CHECK (… >= 0)`.
- An unknown value is `NULL` and an actual zero is `0`, kept distinct (for example, a machine base weight that could not be confirmed is `NULL`).

## Validation and messages

- The rules above are also validated on the server. Do not stop at screen validation.
- Validation errors shown to users are written in English: `Enter the date in YYYY-MM-DD format`.
- The error response format and status codes are decided in #30.
