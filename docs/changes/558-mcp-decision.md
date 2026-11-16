# 558. AI service decision: integrated MCP and AI shell (proposed)

## Change

- `docs/adr/0017-ai-service-mcp-and-shell.md`: proposed ADR. A new shared service `shared-ai` (`ai.daysofme.com`, slot 11) offers one MCP connection for every app's tools and an AI shell backend; a managed panel in `templates/ui` puts the shell in every web app. Tools stay in each app behind one `defineTool` wrapper that checks the scope and writes the audit row. Stage 1 (shell in the browser, stdio over SSH) needs no firewall change; stage 2 (remote MCP clients with OAuth) is a later user decision.

## Reason

- The user asked for an integrated agent and an AI shell across all web projects (2026-11-17), which per-app endpoints alone cannot give.
- Keeping tools in the apps reuses their Zod schemas and keeps the audit row in the same transaction as the change; the AI service never forwards a client token.

## Verification

- Facts checked on 2026-11-17: the MCP TypeScript SDK v2 package split and Express helpers (ts.sdk.modelcontextprotocol.io), and Better Auth's OAuth provider resource-server docs (better-auth.com). App backends all use `zod` 4.6.7; shared-auth uses `better-auth` 1.7.15.
- `npm run check`: see the PR.

## Open

- The user accepts, changes, or rejects the ADR. After acceptance: Status to Accepted, #559 updated, and issues registered for `shared-ai`, the AI shell, and remote MCP.
