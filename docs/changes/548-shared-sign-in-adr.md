# #548 Decide the shared sign-in approach

## Change

| File | Content |
|---|---|
| `docs/adr/0015-shared-sign-in.md` | Compares a central Better Auth service, oauth2-proxy at the proxy, and Better Auth in each app, and chooses the central service: repo `sirloinbh/shared-auth`, registry slot 10 at `auth.daysofme.com`, GitHub and Google limited to the owner, one parent-domain session cookie, per-app OAuth scopes for AI clients, MCP authorization through the same service |

## User decisions (2026-11-15)

- Sign-in providers: GitHub and Google.
- Server resize to 2 GB: right before the auth service is first deployed (#550).

## Facts checked (2026-11-15)

- Better Auth 1.7.25 is the latest stable release; 1.8 is in beta with OAuth provider changes. `@better-auth/oauth-provider` with the `mcp()` and `cimd()` plugins covers the MCP authorization spec (revision 2026-07-28): RFC 9728 metadata, RFC 8414 discovery, PKCE, resource indicators, Client ID Metadata Documents.
- oauth2-proxy 7.15.6 signs users in through nginx `auth_request` but does not issue tokens to other clients, so it cannot serve MCP clients.
- Memory of the auth service is not published anywhere; it is measured in #550.

## Verification

- `npm run check`: recorded in the PR body
