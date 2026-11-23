# #1076 Public URL probe through the host nginx

- Issue: [#1076](https://github.com/sirloinbh/project-standards/issues/1076)
- Branch: `feat/1076-public-url-probe`
- Parent: #1051. Research: [docs/research/uptime-gaps.md](../research/uptime-gaps.md) (#1058, option A)

## Changes — 2026-11-23

- `scripts/lib/public-check.mjs` renders `public-check.sh`, `public-check.service` and `public-check.timer`; `scripts/lib/proxy.mjs` adds them to the proxy files (`node scripts/proxy-config.mjs`, copied to `/opt/project-standards/proxy`). The hosts come from the same registry list as `apps.conf` (8 apps, `auth`, `ai`), so a new app is covered by regenerating the files.
  - Where it differs from the issue text: the probe is server-wide, not a per-app template under `templates/deploy/`. A per-app template cannot list every host, and it would install ten copies of one timer. The proxy folder already holds the server-wide `cert.sh` and its timer, and the shared `/opt/project-standards/.env` holds the ping URLs.
- Every 5 minutes: `curl --resolve <host>:443:127.0.0.1 https://<host>/api/health` (200, 10 s). In the first 5 minutes of each hour (or `full`): `dig +short <host> @1.1.1.1` must return the server address, and the certificate must have 14 days left.
- One signal to `HEALTHCHECK_URL_PUBLIC` (ok with the host count, or fail naming the failing hosts and reasons; no secret in the body). The send is the single function `send_signal`; `PUBLIC_CHECK_SINK` selects it (only `healthchecks` exists, the default). The signal target choice (healthchecks.io or CloudWatch) stays the user's open choice: a new sink is one new case.
- Docs: `docs/server-proxy.md` ("Public URL probe", shared `.env` keys, install), `docs/runbooks/deploy.md` 4-1 (the `public` check), `docs/user-steps.md` section 11 step 6.
- Not done here: opening and closing issues (#1077).

## Verification

- `node --test scripts/test/public-check.test.mjs`: 9 passed, 1 skipped on Windows (all hosts ok; one failing host named in the body; DNS mismatch; certificate near expiry; server address read from checkip; missing dig; no URL, failed ping and unknown sink; bad argument), with a fake `curl`, `dig` and `openssl`.
- `npm run check`: see the PR.
- Not verified: the probe on the real server. The user step in `docs/server-proxy.md` records whether `--resolve` to 127.0.0.1 and a direct public-address probe work there (reported on #1076).
