# 558. MCP tools decision (proposed)

## Change

- `docs/adr/0017-mcp-tools-per-app.md`: proposed ADR. Each app backend serves its own MCP tools (no gateway), through one `defineTool` wrapper that checks the scope and writes the audit row. Stage 1 is local stdio (also over SSH to the server); stage 2 opens `/mcp` remotely with OAuth from shared-auth, after a separate user decision on the firewall.

## Reason

- A gateway would add a process with access to every app and split the audit record from the change. Per-app tools reuse the app's Zod schemas and write the audit row in the same transaction.
- Remote clients need 443 open to the internet, which is a security change of its own. Stage 1 delivers tools without it.

## Verification

- Facts checked on 2026-11-17: the MCP TypeScript SDK v2 package split and Express helpers (ts.sdk.modelcontextprotocol.io), and Better Auth's OAuth provider resource-server docs (better-auth.com). App backends all use `zod` 4.6.7; shared-auth uses `better-auth` 1.7.15.
- `npm run check`: see the PR.

## Open

- The user accepts, changes, or rejects the ADR. After acceptance: Status to Accepted, #559 updated, and a stage 2 issue registered.
