# 0015. One shared sign-in service for all apps, with OAuth scopes for AI tools

- Status: Accepted (issue #548)
- Date: 2026-11-15
- Builds on: [ADR-0009](0009-multi-app-single-lightsail.md) (one server), [ADR-0012](0012-shared-domain-subdomains.md) (subdomains), [ADR-0014](0014-app-secrets-ssm-paths.md) (secrets in SSM)

## Context

- The apps have no login. Access is limited only by the Lightsail firewall's IP allow list. Every app summary in `registry/projects.json` says private access must exist before any public exposure.
- Since #254, every app is `https://<app>.daysofme.com` behind one nginx. Sign-in providers need HTTPS redirect URIs on a real domain, so this is now possible.
- Remote MCP clients (#558) connect from their own servers and need an OAuth 2.1 authorization server. The MCP authorization spec (revision 2026-07-28) requires protected resource metadata (RFC 9728) on the MCP server and OAuth 2.1 with discovery (RFC 8414), PKCE, and resource indicators (RFC 8707) on the authorization server. Client ID Metadata Documents are the preferred client registration; dynamic client registration is deprecated.
- There is one user. The server is 1 GB and must move to 2 GB before the auth service runs (#564, [costs.md](../costs.md)).

## Options considered

| | (A) Central Better Auth service | (B) oauth2-proxy at the proxy | (C) Better Auth in each app |
|---|---|---|---|
| What runs | One Express service with its own Postgres at `auth.<domain>` | One Go binary; nginx `auth_request` on every subdomain | Auth code and tables in all 8 backends |
| Sign-in once for all apps | Yes, one session cookie on the parent domain | Yes, `--cookie-domain` on the parent domain | No: 8 separate user tables and sessions |
| OAuth server for MCP clients | Yes: `@better-auth/oauth-provider` with the `mcp()` and `cimd()` plugins | No: it signs users in with an upstream provider but issues no tokens to other clients | 8 separate authorization servers |
| App code | A shared middleware package (#566) | None (reads `X-Auth-Request-*` headers) | Per app, kept equal by sync |
| Memory | One Node process plus one Postgres (estimate 100–150 MiB idle; measure in #550) | Tens of MiB (Go, not measured) | Grows every app |
| Upgrades | One service; Better Auth releases often, so versions are pinned | One image | 8 apps at once |
| Moving parts | 1 service, 1 package | 1 service | 0 services, 8 copies |

(B) is the lightest, but MCP needs an authorization server anyway, so (B) would be replaced later. (C) multiplies the same code and the MCP authorization server by 8.

## Decision

| Item | Decision |
|---|---|
| Approach | (A): a central Better Auth service. Better Auth uses the built-in Kysely adapter with a `pg.Pool`, so no ORM is added |
| Repo and slot | New repo `sirloinbh/shared-auth`, a sync target with the `app` profile. Registry entry `shared-auth`, slot 10 (slot 9 is the local tool file-control), `service.subdomain` `auth`. `auth` is a reserved subdomain for shared services, so the registry check allows it only for this entry. Own compose and Postgres, deploy timer, and backups like any app (ADR-0009) |
| Address | `https://auth.daysofme.com`. Callback URLs `https://auth.daysofme.com/api/auth/callback/github` and `.../callback/google` |
| Providers | GitHub and Google (user decision, 2026-11-15). GitHub asks for `user:email` |
| Who may sign in | Only the owner. A `databaseHooks.user.create.before` hook rejects any email that is not in the allow list, and the GitHub and Google accounts link to one user by verified email. The allow list is not written in the public repo; it is the SSM parameter `/sirloinbh/shared-auth/allowed-emails` |
| Session for the web apps | One session cookie on `daysofme.com` (`advanced.crossSubDomainCookies`), cookie prefix `sirloinbh`. Every subdomain is one of our own apps (no wildcard DNS record, ADR-0012), so sharing it is safe. It is the only cookie shared across apps (#565) |
| Session check in an app | The app API checks the session with the auth service over a private Docker network `shared-auth` that both compose projects join, never through the public address (the firewall allows only the user's IPs, not the server itself). Unauthenticated web requests redirect to sign-in; API calls return 401. This lives in `@sirloinbh/auth-client` (#566) |
| Permission model | One owner user; no organizations or roles until a second user is planned. AI clients get OAuth scopes per app: `<app>:read` and `<app>:write` (for example `workout-memo:read`), plus `openid`, `profile`, `email`, `offline_access`. A consent page shows the scopes |
| MCP clients | `@better-auth/oauth-provider` with the `mcp()` and `cimd()` plugins: PKCE, resource indicators, Client ID Metadata Documents. Dynamic client registration stays off. Each app's MCP endpoint checks the token audience and scope (details in #558) |
| Secrets | SSM under ADR-0014: `/sirloinbh/shared-auth/better-auth-secret`, `github-client-id`, `github-client-secret`, `google-client-id`, `google-client-secret`, `allowed-emails` |
| Versions | `better-auth` and its plugins are pinned to exact versions that are at least 14 days old ([dependency-policy.md](../dependency-policy.md)). It releases several patches a week, and 1.8 changes the OAuth provider, so upgrades go through workout-memo first |
| Server | Resize to 2 GB as a user step right before the auth service is first deployed (#550; user decision, 2026-11-15) |
| Network access | Unchanged: 80 and 443 stay open only to the allowed IPs. Opening `/mcp` or a whole app to the internet is decided per app later (#558) |

## Consequences

- If the auth service is down, every app's sign-in breaks together, like the shared proxy (ADR-0012). Existing sessions keep working only as long as the app's session check is cached; the cache time is set in #566.
- Adding an app means adding its scopes to the auth service and a DNS record and proxy entry as before. No new sign-in setup.
- The parent-domain cookie means any code served from a subdomain of `daysofme.com` can receive the session. No subdomain may serve someone else's content.
- Google OAuth apps in "Testing" status expire their refresh tokens after 7 days. Sign-in uses only the ID token, so this does not matter until an app calls Google APIs on the user's behalf.
- Memory is measured in #550 and recorded in [costs.md](../costs.md).

## Follow-up work

| Issue | What this decision settled |
|---|---|
| #549 | Repo `sirloinbh/shared-auth`; GitHub and Google OAuth apps with the callback URLs above; the six SSM parameters above |
| #550 | Registry slot 10, subdomain `auth`, the `shared-auth` Docker network, the 2 GB resize before the first deploy, workout-memo as the pilot |
| #566 | The middleware checks the session over the `shared-auth` network and caches the result |
| #565 | The shared session cookie is the only cross-app cookie |
| #558 | The MCP authorization server is this service; scopes are `<app>:read` and `<app>:write` |
