# 0017. One AI service for all apps: an integrated MCP server and an AI shell in every web app

- Status: Accepted (issue #558; user decision, 2026-11-17)
- Date: 2026-11-17
- Builds on: [ADR-0009](0009-multi-app-single-lightsail.md) (one server, IP allow list), [ADR-0010](0010-claude-api-key-ssm.md) and [ADR-0014](0014-app-secrets-ssm-paths.md) (one Claude API key in SSM), [ADR-0015](0015-shared-sign-in.md) (the shared sign-in is the OAuth server; scopes `<app>:read` and `<app>:write`)

## Context

- The user wants AI to work across all web apps in two ways (2026-11-17):
  - **Integrated agent**: one MCP connection that reaches the tools of every app, not one connection per app.
  - **AI shell**: a chat panel in every web app where the AI can read and change data in any app through the same tools.
- Every action must run under the owner and leave an audit record (#545). The audit log is #553 and is not built yet. The first pilot app is workout-memo (#559).
- The apps are Vite plus Express 5 with Zod 4 schemas for every API body. Each app has its own Postgres. The server has 2 GB of memory shared by 8 apps, shared-auth, and the proxy.
- Since #551 every app is behind the shared sign-in. The session cookie is on `daysofme.com`, so any of our subdomains receives it.
- MCP TypeScript SDK v2 split into `@modelcontextprotocol/server` (tools, stdio), `@modelcontextprotocol/node` (Streamable HTTP for Node), and `@modelcontextprotocol/express` (Express helpers, host-header checks, bearer-token middleware with a verifier you supply). It has no authorization server. Tool input is defined with Standard Schema, which Zod 4 implements. `mcp-handler` targets Next.js and Nuxt and does not fit.
- Better Auth's OAuth provider plus its JWT plugin issue JWT access tokens bound to a resource (RFC 8707) and publish a JWKS. shared-auth runs Better Auth 1.7.15; in 1.8 the MCP plugin becomes the OAuth provider itself.
- The MCP spec forbids token passthrough: a server must not forward the client's token to another service.
- Remote MCP clients such as claude.ai call from their own servers. The firewall opens 80 and 443 only to the owner's IPs, so they cannot reach the server today. The AI shell runs in the owner's browser, so it works behind the allow list.
- Only study-log calls the Claude API today, through one shared key (`/sirloinbh/shared/anthropic-api-key`, `CLAUDE_MODEL`).

## Options considered

| | (A) `/mcp` in each app, no shared service | (B) One AI service that calls each app's REST API | (C) One AI service over tool endpoints in each app |
|---|---|---|---|
| One connection for all apps | No: one connector per app | Yes | Yes |
| AI shell across apps | Each app's shell sees only its own tools | Yes | Yes |
| Where tools are defined | In each app | In the AI service, copying request shapes from 8 repos | In each app, with the app's own Zod schemas |
| Scope check and audit row | In the app, in the same transaction as the change | In the AI service, apart from the change | In the app, in the same transaction as the change |
| New process | None | One (estimate 60 to 100 MiB, not measured) | One (same) |
| Changing a tool | App PR only | AI service PR for every app change | App PR only; the AI service reads the tool list at runtime |
| Blast radius | One app | The AI service can call every app | The AI service can call every app, but each app still checks scopes and audits |

(A) cannot give one connection or a cross-app shell. (B) moves tool code away from the data and splits the audit record from the change. (C) gives both requirements and keeps the checks in the apps.

## Decision

### Shape

(C). A new shared service **`shared-ai`** at `https://ai.daysofme.com` (new repo `sirloinbh/shared-ai`, `service` profile, registry `sharedServices` slot 11, subdomain `ai`, its own compose and Postgres, deploy timer and backups like shared-auth). It has three parts:

| Part | What it does |
|---|---|
| Tool hub | On start and every few minutes, reads each app's tool list from `http://<app>-api:<port>/internal/tools` over a private Docker network `shared-ai`. Calls a tool with `POST /internal/tools/<name>`. An app that is down drops out of the list until it answers again |
| Integrated MCP server | One MCP server that lists every app's tools under one connection. Tool names get the app prefix here (`workout_memo__list_workouts`), because one server holds all apps |
| AI shell backend | `POST /api/chat` streams a Claude conversation that can call the same tools. It uses the shared Claude key from SSM and keeps chat history in its own Postgres |

### Tools stay in the apps

| Item | Decision |
|---|---|
| Definition | Each app defines its tools in its backend with a shared `defineTool` helper (a managed template file), using the app's existing Zod schemas as Standard Schema |
| Names | `snake_case`, `<verb>_<noun>` in the app (`list_workouts`, `add_workout`). Verbs: `list`, `get`, `add`, `update`, `delete`, plus domain verbs where clearer |
| Annotations | Read tools set `readOnlyHint: true`; delete tools set `destructiveHint: true`. The shell asks the owner before running any tool that is not read-only; MCP clients use the hints the same way |
| Checks | `defineTool` declares the scope (`<app>:read` or `<app>:write`), rejects a caller without it, and writes one `audit_log` row per call: actor type `ai-tool`, the client (`ai-shell`, an MCP client ID, or `stdio`), tool name, action, entity, ID, and result. Write tools write the row in the same transaction as the change. A tool cannot skip either step |
| Internal endpoint | `/internal/tools` is served only on the `shared-ai` Docker network, never through the proxy. Each call carries a short-lived JWT signed by `shared-ai` that states the owner, the client, and the granted scopes; the app checks the signature against `shared-ai`'s public key and then applies the scope. The client's own token is never forwarded (no token passthrough) |

### Who may use it, in stages

| Stage | Client | Authentication | Firewall |
|---|---|---|---|
| 1 | The AI shell in every web app | The shared session cookie. The shell calls `https://ai.daysofme.com/api/chat` with credentials; CORS allows only our app subdomains. Scopes: all apps, read and write, with confirmation in the UI before writes | No change |
| 1 | Claude Code or Claude Desktop on the PC | stdio through SSH: `ssh ubuntu@<server> docker exec -i shared-ai-api-1 node dist/mcp-stdio.js`. The SSH key is the authentication (load a passphrase key in ssh-agent first) | No change |
| 2 (later, a separate user decision) | Remote MCP clients such as claude.ai | OAuth 2.1 from shared-auth: the OAuth provider with the JWT plugin (and the MCP plugin from 1.8), PKCE, resource indicators, Client ID Metadata Documents; dynamic client registration stays off. `shared-ai` serves `/.well-known/oauth-protected-resource` and checks the JWT access token (signature against shared-auth's JWKS, issuer, audience `https://ai.daysofme.com/mcp`, expiry, scopes). The consent page lets the owner grant per-app scopes | 443 opens to the internet; from outside the owner's IPs the proxy lets through only `ai.daysofme.com/mcp`, its metadata path, and the OAuth metadata, `token`, and `jwks` endpoints of `auth.daysofme.com`. An infrastructure change that needs the user's OK |

### The AI shell in the apps

| Item | Decision |
|---|---|
| UI | A managed React component in `templates/ui` (a panel opened from the top bar), so all 8 apps get it through sync. It streams answers, shows each tool call with its app, and asks before calls that are not read-only |
| Context | The shell sends the current app and page, so "add today's workout" means this app unless the user names another |
| Model and cost | `CLAUDE_MODEL` and the shared key (ADR-0010). `shared-ai` records tokens per conversation in its database; the LLM gateway and tracing decision in #545 can replace this later |

### SDK and versions

`@modelcontextprotocol/server`, `@modelcontextprotocol/node`, and `@modelcontextprotocol/express` v2, and the Anthropic TypeScript SDK, in `shared-ai` only. Apps need none of them, because they serve a plain JSON tool endpoint. Exact versions, at least 14 days old ([dependency-policy.md](../dependency-policy.md)); each first install needs the user's confirmation.

## Consequences

- One new process on the server (`shared-ai` plus its Postgres). Memory is measured in the first deploy and recorded in [costs.md](../costs.md).
- `shared-ai` can call every app's tools. Each app still checks the scope from the signed call and writes its own audit row, so a bug in `shared-ai` cannot skip an app's audit.
- The audit log (#553) comes before the first tool, because `defineTool` writes to it.
- If `shared-ai` is down, the shell and the MCP connection stop; the apps keep working. If shared-auth is down, the shell stops too, because it needs the session.
- Claude API use grows with the shell. It is still one key and one spending limit (ADR-0010); a per-service key can be split later.
- Stage 2 would make `ai.daysofme.com/mcp` the first public path on the server. Until the user decides it, remote clients cannot connect.

## Follow-up work

| Issue | What this decision settles |
|---|---|
| #553 | `audit_log` needs columns for actor type `ai-tool`, the client, and the tool name |
| #559 | workout-memo pilot: `defineTool`, 2 or 3 tools, and `/internal/tools` on the `shared-ai` network |
| #611 `shared-ai` service | Repo, registry slot 11, subdomain `ai`, tool hub, integrated MCP server (stdio first), signed internal calls |
| #612 AI shell | The `templates/ui` panel and `POST /api/chat` |
| #613 remote MCP (later) | The OAuth provider in shared-auth, the token check in `shared-ai`, the proxy and firewall change (stage 2) |
