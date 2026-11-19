# AI tools in the apps

Each app serves its own AI tools; the shared service `shared-ai` lists them and offers them through one MCP connection and the AI shell ([ADR-0017](adr/0017-ai-service-mcp-and-shell.md)). The managed file `backend/src/standard/tools.ts` does the shared part (#559): the signed call check, the scope check, the audit row, and the transaction. workout-memo is the pilot.

## Defining a tool

```ts
// backend/src/ai-tools.ts (app-owned)
import { dateRange } from './domain.js';
import type { Db } from './routes/shared.js';
import { listWorkouts } from './routes/workouts.js';
import { defineTool } from './standard/tools.js';

export const tools = [
  defineTool({
    name: 'list_workouts',                // <verb>_<noun>, snake_case
    description: 'List the workout journals between two dates (YYYY-MM-DD), newest first.',
    input: dateRange,                     // the app's Zod 4 schema (Standard Schema)
    access: 'read',                       // read needs <app>:read, write needs <app>:write
    action: 'read',                       // audit action: read, create, update, delete
    entity: 'workout',
    run: async (range, { db }: { db: Db }) => ({ result: await listWorkouts(db, range) }),
  }),
];
```

- Reuse the app's own query functions and Zod schemas, so a tool and the REST route cannot drift apart.
- `run` returns `{ result }` for the AI, plus `entityId`, `before` and `after` for the audit row of a change. Keep `before`/`after` small ([audit-log.md](audit-log.md)).
- Set `destructive: true` on a tool that deletes or overwrites; clients ask the owner first. Read tools are marked read-only.
- A read tool gets the pool. A write tool gets a transaction client; its audit row is written in the same transaction, and a thrown error rolls both back and records an `error` row.
- The input schema must be expressible as JSON Schema (`z.undefined()` is not); otherwise the app fails at start. Bound list sizes in the schema (workout-memo allows at most 366 days per call).

## Serving them

```ts
// backend/src/app.ts, after express.json() and before app.use('/api', notFound)
registerToolRoutes(app, { app: 'workout-memo', tools, pool, publicKey: options.toolsPublicKey });
```

| Route | Answer |
|---|---|
| `GET /internal/tools` | `{ app, tools: [{ name, description, inputSchema, scope, annotations }] }` |
| `POST /internal/tools/<name>` | `{ result }`; 401 bad or missing token, 403 missing scope, 404 unknown tool, 400 invalid input |

- The routes are registered only when `AI_TOOLS_PUBLIC_KEY` (shared-ai's Ed25519 public key, PEM; `\n` escapes are accepted in `.env`) is set. Without it `/internal/tools` is the app's JSON 404.
- `/internal` is outside `/api`: nginx forwards only `/api`, so the proxy never reaches the tools, and the shared sign-in session is not used. `shared-ai` calls the API container directly on the private Docker network `shared-ai` at `http://<app>-api:<registry api port>`.

### Joining the shared-ai network (#611)

The app's own `compose.yaml` (new apps get it from the scaffold):

```yaml
  api:
    environment:
      AI_TOOLS_PUBLIC_KEY: ${AI_TOOLS_PUBLIC_KEY:-}
    networks:
      default: {}
      shared-auth: {}
      shared-ai: { aliases: [<app>-api] }
networks:
  shared-ai:
    name: shared-ai
    external: true
```

and in `.env.example`, so the deploy reads the key from SSM:

```bash
# @desc shared-ai's Ed25519 public key (PEM, one line with \n escapes) ... @secret @used=backend,compose @ssm=/sirloinbh/shared/ai-tools-public-key
AI_TOOLS_PUBLIC_KEY=
```

The network is external everywhere. `deploy/remote-deploy.sh` (managed) creates it when `compose.yaml` uses it and it is missing, and so does the shared-ai deploy, so an app and shared-ai can deploy in either order. Locally, create it once: `docker network create shared-ai`. The key pair is made once with `backend/scripts/signing-key.mjs` in sirloinbh/shared-ai (its README); the private half stays in shared-ai.

## The call token

`shared-ai` signs one compact JWT per call (EdDSA, Ed25519). The app checks, with Node's `crypto` only:

| Claim | Check |
|---|---|
| header `alg` | `EdDSA` |
| `iss`, `aud` | `shared-ai`, and the app name |
| `iat`, `exp` | not in the future, not expired (30 s clock skew), and valid for at most 120 s (shared-ai signs 60 s) |
| `sub` | the owner (shared sign-in user ID), recorded as `actor_id` |
| `client` | `ai-shell`, the MCP client ID, or `stdio`, recorded as `client` |
| `scope` | space-separated, e.g. `workout-memo:read workout-memo:write` |
| `tool` | the tool this token is for (`@list` for `GET /internal/tools`); a token for another route is a 401 |
| `jti` | a unique ID; the app remembers it until the token expires, so a second use of the same token is a 401 |

The client's own token never reaches the app (no token passthrough). A token is valid for one call (#670): a captured token cannot be replayed or used for another tool. The `jti` set is in memory per API process, which is enough because tokens live at most 120 s and shared-ai calls one API container per app.

**Deploy order for #670.** (1) Apps get the verifier that accepts tokens with or without `tool` and `jti` (it enforces both when present); (2) shared-ai deploys the signer that adds them; (3) each app sets `requireBinding: true` in `registerToolRoutes`, so a token without the claims is refused.

## Audit rows

Every authenticated call writes one `audit_log` row with actor type `ai-tool`, the tool name, the client and the request ID: `ok`, `denied` (missing scope), or `error` (invalid input or a failure). A call with a bad token writes no row; it is in the request log as a 401.
