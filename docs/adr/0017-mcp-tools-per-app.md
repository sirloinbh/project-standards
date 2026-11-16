# 0017. Each app serves its own MCP tools, local first and remote later

- Status: Proposed (issue #558). The user decides; the recommendation is marked below
- Date: 2026-11-17
- Builds on: [ADR-0009](0009-multi-app-single-lightsail.md) (one server, IP allow list), [ADR-0015](0015-shared-sign-in.md) (the shared sign-in is the OAuth server; scopes `<app>:read` and `<app>:write`)

## Context

- AI clients should read and change app data through MCP tools, under the owner, with an audit record (#545). The first pilot is workout-memo (#559). The audit log is #553 and is not built yet.
- The apps are Vite plus Express 5 with Zod 4 schemas for every API body. Each app has its own Postgres. The server has 2 GB of memory shared by 8 apps, shared-auth, and the proxy.
- MCP TypeScript SDK v2 split into `@modelcontextprotocol/server` (tools, stdio), `@modelcontextprotocol/node` (Streamable HTTP for Node), and `@modelcontextprotocol/express` (Express helpers, host-header checks, bearer-token middleware that takes a verifier you supply). It has no authorization server of its own. Tool input is defined with Standard Schema, which Zod 4 implements. `mcp-handler` targets Next.js and Nuxt and does not fit.
- On the auth side, Better Auth's OAuth provider plus its JWT plugin issue JWT access tokens bound to a resource (RFC 8707) and publish a JWKS. Resource servers check the token and the scope themselves. shared-auth runs Better Auth 1.7.15; in 1.8 the MCP plugin becomes the OAuth provider itself, so the plugin setup depends on the version at the time.
- Remote MCP clients such as claude.ai call from their own servers. The Lightsail firewall opens 80 and 443 only to the owner's IPs, so they cannot reach the server today.

## Options considered

| | (A) `/mcp` in each app backend | (B) One MCP gateway service | (C) Gateway in front of per-app servers |
|---|---|---|---|
| What runs | The tools run inside each Express backend, next to its routes | A new service at `mcp.daysofme.com` that calls each app's REST API | (A) plus a proxy that merges the 8 tool lists |
| Tool code | Reuses the app's Zod schemas and domain functions in the same process | Duplicates request shapes or imports them across repos | As (A) |
| Auth | Each app checks the token audience (its own URL) and its own scopes | The gateway checks the token, then calls apps with a service credential that every app must trust | Two layers of token checks |
| Audit log | Written in the app's own DB, in the same transaction as the change (#553) | The gateway writes it apart from the change, or every app accepts an actor header from it | As (A) |
| Memory | Nothing new runs | One more Node process (estimate 60 to 100 MiB, not measured) | One more process |
| Deploys | Ships with the app and its CI | Must change whenever any app's API changes | Both |
| Client setup | One connector per app (8 at most) | One connector | One connector |
| Blast radius | A bug affects one app | A gateway bug or leaked credential reaches all 8 apps | As (B) |

(B) and (C) save the client setup (one connector instead of several) but add a service that can act on every app, and they split the audit record from the change. With one user, adding a connector per app is a few minutes once.

## Decision (recommended)

| Item | Decision |
|---|---|
| Shape | (A): each app backend serves its own tools. No gateway |
| SDK | `@modelcontextprotocol/server` for tools and stdio. Remote HTTP adds `@modelcontextprotocol/express` and `@modelcontextprotocol/node`. Exact versions, at least 14 days old ([dependency-policy.md](../dependency-policy.md)); the first install needs the user's confirmation. Versions go in `versions.json` like other shared app dependencies |
| Tool input | The app's existing Zod schemas, passed as Standard Schema. No second schema |
| Tool names | `snake_case`, `<verb>_<noun>`, for example `list_workouts`, `add_workout`. Verbs: `list`, `get`, `add`, `update`, `delete`, plus domain verbs where clearer. The MCP server name is the app's registry name (`workout-memo`), so clients show `workout-memo` / `list_workouts` and names never need an app prefix |
| Annotations | Read tools set `readOnlyHint: true`. Delete tools set `destructiveHint: true`. Clients use these to ask the user before running a tool |
| One wrapper for every tool | Apps register tools only through a shared `defineTool` helper (a managed template file). It declares the tool's scope (`<app>:read` or `<app>:write`), rejects a caller without it, and writes one `audit_log` row per call (actor type `ai-tool`, client ID, tool name, action, entity, ID, result). A tool cannot skip either step. Write tools write the row in the same transaction as the change |
| Stage 1: local only | Each app gets a stdio entry point (`node dist/mcp-stdio.js`) that uses the same tool registry. A local client runs it against the local database, or against the server through SSH: `ssh ubuntu@<server> docker exec -i <app>-api-1 node dist/mcp-stdio.js`. The SSH key is the authentication, so stdio calls get both scopes of that app, and the audit actor ID is `stdio`. The client starts ssh without a terminal, so a key with a passphrase must be loaded in ssh-agent first. No firewall change |
| Stage 2: remote | Later and per app, after the user's decision: `POST /mcp` with stateless Streamable HTTP. shared-auth enables the OAuth provider with the JWT plugin (and the MCP plugin from 1.8), PKCE, resource indicators, and Client ID Metadata Documents; dynamic client registration stays off (ADR-0015). Each app serves `/.well-known/oauth-protected-resource` and checks the JWT access token: signature against shared-auth's JWKS over the private `shared-auth` network, issuer, audience equal to its own `https://<app>.daysofme.com/mcp`, expiry, and scope. The check goes into `@sirloinbh/auth-client` with `node:crypto`, so apps add no JWT library |
| Firewall for stage 2 | Remote clients call from addresses we do not know, so 443 must open to the internet. The proxy then allows only these paths from outside the owner's IPs: each opted-in app's `/mcp` and `/.well-known/oauth-protected-resource`, and on `auth.daysofme.com` the OAuth metadata, `token`, and `jwks` endpoints. The sign-in and consent pages are opened in the owner's browser, so they stay behind the IP allow list. This is an infrastructure change (shared-aws-infrastructure and `docs/server-proxy.md`) that needs the user's OK |

## Consequences

- Nothing new runs on the server. The memory cost is the SDK code in each app that adopts tools.
- The audit log (#553) comes before the first tool, because `defineTool` writes to it.
- A client sees each app as its own MCP server. Cross-app questions (for example "workouts versus sleep") call two servers.
- Stage 1 gives the AI client full read and write access to that app through SSH. That is the same access the SSH key already gives.
- Stage 2 makes `/mcp` the first public path on the server. Each app's tool code becomes internet-facing, so the scope check and the audience check are what protect it, along with the stateless transport and rate limits in the proxy.
- If shared-auth is down, remote tools stop working; stdio tools keep working.

## Follow-up work

| Issue | What this decision settled |
|---|---|
| #559 | workout-memo pilot: `defineTool`, 2 or 3 tools, and the stdio entry point (stage 1). Tests call each tool with and without the scope and check the audit row |
| #553 | `audit_log` needs columns for actor type `ai-tool`, client ID, and tool name |
| New issue after acceptance | Stage 2: the OAuth provider in shared-auth, the token check in `@sirloinbh/auth-client`, and the proxy and firewall change |
