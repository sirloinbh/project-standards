# Adding the first AI tool to an app

The recipe for an app that has no AI tool yet (#711, [ADR-0024](../adr/0024-audit-ai-tool-calls-only.md)). One PR in the app repo adds **one read-only list tool** and the **`audit_log` migration** together: a tool call in an app without the table fails with "relation does not exist", so the two never ship apart. The reference implementation is workout-memo (`backend/src/ai-tools.ts`, `database/migrations/017_audit_log.sql`, `backend/test/ai-tools*.test.ts`). The mechanism is in [ai-tools.md](../ai-tools.md) and [audit-log.md](../audit-log.md); this page is the checklist.

A write tool is a separate, later decision of the user. Do not add one in this PR.

## 0. Check the starting point

The app already has the managed files `backend/src/standard/tools.ts`, `standard/audit.ts` and `standard/db.ts` (sync sends them to every app, unused until now). Confirm with `ls backend/src/standard`. Do not edit them; if one is wrong, change the source in project-standards.

## 1. Pick the tool

- Name `list_<noun>` (plural, snake_case), e.g. `list_workouts`. One entity, one tool.
- Read-only: `access: 'read'`, `action: 'read'`, `entity` the singular snake_case record kind. Reads are recorded in the audit log, so the owner sees what the AI looked at.
- Choose the entity the owner would most often ask about, and expose only fields the app's own list route already returns. Leave out secrets and long private text unless the route returns them to the owner anyway.
- Reuse the app's own query function and Zod schema. If the route handler holds the SQL inline, move it into an exported function (for example `listWorkouts(db, range)`) that takes a `Db` (`Pick<Pool, 'query'>`), and call it from both the route and the tool, so they cannot drift. This is a pure move; the route tests must pass unchanged.
- Bound the result in the input schema: a date range of at most 366 days, or `limit` (default 50, maximum 200) with a stable `ORDER BY`. A tool must not return the whole history.
- The input must be expressible as JSON Schema; `z.undefined()` is not. An empty input is `z.object({})`.

## 2. Files in the app PR

| File | Change |
|---|---|
| `database/migrations/NNN_audit_log.sql` | The next number, content copied unchanged from [`scaffold/app/database/migrations/002_audit_log.sql`](../../scaffold/app/database/migrations/002_audit_log.sql) (same checksum rules as [database.md](database.md); do not use a lower number than an applied file) |
| `backend/src/ai-tools.ts` | New, app-owned: `export const tools = [defineTool({ … })]` as in [ai-tools.md](../ai-tools.md) |
| `backend/src/app.ts` | `registerToolRoutes(app, { app: '<name>', tools, pool, publicKey: options.toolsPublicKey, requireBinding: true })` after `express.json()` and before `app.use('/api', notFound)`; add `toolsPublicKey?: string` to the options type |
| `backend/src/server.ts` | Pass `toolsPublicKey: process.env.AI_TOOLS_PUBLIC_KEY` to `createApp` |
| `compose.yaml`, `.env.example` | Check they already have `AI_TOOLS_PUBLIC_KEY`, the `shared-ai` network with the alias `<name>-api`, and the external `shared-ai` network ([ai-tools.md](../ai-tools.md#joining-the-shared-ai-network-611)). Add what is missing; the scaffold has all three |
| `backend/test/ai-tools.integration.test.ts` | See section 3 |
| `docs/api.md` | One line: the app serves `/internal/tools` for shared-ai when `AI_TOOLS_PUBLIC_KEY` is set |
| `docs/changes/<issue>-<slug>.md` | The usual change record |

`requireBinding: true` is mandatory for a new app: shared-ai has signed the `tool` and `jti` claims since 2026-11-20 (#670, #822).

## 3. Tests

Copy the workout-memo test and cut it down to the read path (`TEST_DATABASE_URL` is set in CI, so it runs there):

- Signs tokens with a test Ed25519 key. The token carries `iss: 'shared-ai'`, `aud: '<name>'`, `sub` (a random owner per run), `client`, `scope`, `tool`, a fresh `jti`, `iat` and `exp` (60 s).
- `GET /internal/tools` with a `@list` token returns the tool with `readOnlyHint: true`.
- No token or a token signed with another key is 401; a token with only the wrong scope is 403.
- A valid call returns the seeded record; an out-of-range input is 400.
- The audit rows for that owner, in order, are `denied`, `ok`, `error`, with `actor_type = 'ai-tool'`, the right `tool`, `entity` and `client`.
- Without `toolsPublicKey`, `/internal/tools` is the JSON 404.
- Also copy the small binding test (`ai-tools-binding.test.ts`): an unbound, wrong-tool or replayed token is a 401.

Run the app's own check (`npm run lint`, `typecheck`, tests) with Postgres up, as CI does.

## 4. Verify live after the merge

The merge deploys the app. Then check, in this order, and tick the app on #711:

1. Deploy finished: deployed commit = main, health 200 on the public URL, no `.autodeploy-failed`.
2. The app is in the shared-ai hub: shared-ai reads each app's tool list at start and every 3 minutes, so wait up to 3 minutes (restarting shared-ai needs the user's OK) and look for `<app>__list_<noun>` in the AI shell's tool list (the app part has underscores, see step 3).
3. Call the tool through shared-ai (the AI shell or the MCP connection) as the owner. Name it `<app>__list_<noun>` there: shared-ai adds the app prefix and turns the app's hyphens into underscores, so money-ledger's `list_entries` is `money_ledger__list_entries`. A call with the hyphenated name (`money-ledger__list_entries`) fails with "Tool … not found" even though the tool is listed; copy the name from `tools/list`.
4. The audit row exists:

```sh
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "select at, actor_type, client, tool, action, entity, result from audit_log order by at desc limit 5"
```

Expect `ai-tool`, the client you used, `list_<noun>`, `read`, the entity, `ok`.

If the app is missing from the hub, the usual causes are: `AI_TOOLS_PUBLIC_KEY` unset on the server (the routes are then not registered), the `shared-ai` network or alias missing in `compose.yaml`, or the app not on the shared-ai app list (it is generated from `registry/projects.json`, so all 8 apps are listed already).

## 5. What not to do

- Do not write audit rows from the app's HTTP routes ([ADR-0024](../adr/0024-audit-ai-tool-calls-only.md)).
- Do not add a write tool, a second tool, or a new scope in the same PR.
- Do not edit `standard/*.ts`, and do not log or audit whole rows with long text (`before`/`after` stay small; pass `omit` for private text).
