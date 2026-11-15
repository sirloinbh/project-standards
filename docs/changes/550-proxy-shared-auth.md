# #550 Proxy entry for the shared sign-in

## Change

| File | Content |
|---|---|
| `scripts/lib/proxy.mjs` | `proxyApps` also returns the registry `sharedServices`, so the generated nginx config forwards `auth.<root domain>` to `127.0.0.1:8110` and redirects its HTTP to HTTPS |
| `scripts/test/proxy.test.mjs` | 9 server blocks; the `auth` block and redirect |
| `docs/server-proxy.md` | Mentions the shared sign-in |

## On the server [User]

Regenerate and copy `nginx/apps.conf` as in [server-proxy.md](../server-proxy.md) "Changes later", then `sudo bash cert.sh reload`. The wildcard certificate already covers `auth.daysofme.com`.

## Verification

- `npm run check`: recorded in the PR body
