# #251 Generate the server reverse proxy and HTTPS renewal from the registry

## Change

| File | Content |
|---|---|
| `scripts/lib/proxy.mjs`, `scripts/proxy-config.mjs`, `package.json` (`npm run proxy`) | Generates `nginx/apps.conf`, `compose.yaml`, `cert.sh`, and the `cert-renew` service and timer from the registry into `.local/proxy/` |
| `scripts/test/proxy.test.mjs` | All 8 apps' subdomains and web ports, redirect and unknown-name handling, DNS validation and wildcard flags, pinned images, refusal without a root domain, Linux line endings, `bash -n` |
| `versions.json`, `versions.schema.json`, `docs/versions.md` | `images.certbot`: `certbot/dns-route53:v5.9.0`, digest pinned |
| `docs/server-proxy.md` | What is generated, shared `.env` keys, first install (#253), later changes, limits |
| `docs/adr/0012-shared-domain-subdomains.md` | Renewal failure alert decided: `HEALTHCHECK_URL_CERT` |

## Decisions

- **A central script, not a synced template.** The proxy is one per server and lists all apps, but the sync renderer fills only single values, and `rootDomain` is still `null`. The output is copied to `/opt/project-standards/proxy/` like the shared `.env`.
- **Image:** certbot `v5.9.0` (released 2026-10-29, the newest one at least 14 days old), pinned by digest. ADR-0012 chose the official nginx and certbot `dns-route53` images; it is pulled on the server only at #253. nginx reuses `versions.images.nginx` so the stack has one nginx version.
- **Headers:** the proxy adds only HSTS (`max-age=31536000`, no `includeSubDomains` or preload, so it can be undone). nosniff and Referrer-Policy already come from each app's nginx.
- **Unknown names:** 80 returns 444 and 443 rejects the TLS handshake, matching the "no wildcard A record" choice.
- **Renewal alert:** the timer runs twice a day and pings healthchecks.io; a failed renewal or nginx reload sends a failure ping.
- **Runbook location:** `docs/runbooks/` holds only per-app templates (a test pins the list), so the server-wide runbook is `docs/server-proxy.md`.

## Verification

- `node --test scripts/test/proxy.test.mjs`: 8 passed
- `npm run check`: recorded in the PR body
