# #611 Register the shared AI service

## Change

| File | Content |
|---|---|
| `registry/projects.json` | `sharedServices` slot 11: `shared-ai`, repo `shared-ai`, subdomain `ai`, ports web 8111, api 3111, db 15411 (ADR-0017) |
| `docs/projects.md` | Regenerated (`npm run docs`) |
| `scripts/lib/proxy.mjs` (unchanged) | Already returns every shared service, so the generated nginx config now forwards `ai.<root domain>` to `127.0.0.1:8111` and redirects its HTTP |
| `sync.config.json` | Target `sirloinbh/shared-ai` with the `service` profile (rollout 3) |
| `scripts/test/registry.test.mjs`, `proxy.test.mjs`, `app-secrets.test.mjs`, `sync.test.mjs`, `fixtures/sync-snapshot.json` | Slot 11 and its ports; the `ai` server block (10 blocks); `/sirloinbh/shared-ai/<name>` is accepted by `tools/app-secrets.mjs set` (no code change: it reads `sharedServices`); 11 sync targets and the shared-ai snapshot |
| `AGENTS.md`, `README.md`, `docs/` | Lists and counts of synced repos, the GitHub App install list (user step), the per-repo merge table, the proxy doc |

## Choices made without asking

- Ports follow the slot formula (8100/3100/15400 + 11). The service has no e2e or Vite ports, like shared-auth.
- The sync target is added before the repo has its code. Until the user adds shared-ai to the GitHub App, the `sync` workflow reports a failure for this one target and still syncs the others.

## User steps

1. GitHub App: add `shared-ai` to the installed repos ([user-steps.md](../user-steps.md) 3-3).
2. DNS and SSM read access: the shared-aws-infrastructure PR for #611 (`ai` record, `shared-ai` in `secret_apps`), then `terraform apply`.
3. Proxy: regenerate and copy `nginx/apps.conf` as in [server-proxy.md](../server-proxy.md) "Changes later", then `sudo bash cert.sh reload`. The wildcard certificate already covers `ai.daysofme.com`.

## Verification

- `npm run check`: see the PR.
