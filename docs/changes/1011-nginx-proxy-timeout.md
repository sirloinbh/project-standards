# #1011 Raise the nginx API proxy timeout to 300 seconds

- Issue: [#1011](https://github.com/sirloinbh/project-standards/issues/1011)
- Branch: `chore/1011-nginx-proxy-timeout`
- Follow-up of sirloinbh/study-log#268 (PR #324)

## Change — 2026-11-23

| File | Content |
|---|---|
| `templates/app/frontend/nginx.conf.tmpl` | `location /api/` sets `proxy_read_timeout 300s;` and `proxy_send_timeout 300s;` |
| `scripts/test/docker.test.mjs` | Every rendered `frontend/nginx.conf` has both lines under `/api/` and nowhere else |

## Notes

- Why: study-log's Claude extraction and translation have a 240 s total budget, and nginx cut requests off at its 60 s default. The user chose 300 s on 2026-11-23. The 60 s default is replaced for all 8 apps because the template is shared; other apps' API calls are short, so nothing changes for them in practice.
- Only `/api/`; static files keep the defaults.
- The shared host proxy in front of the containers (ADR-0012) has its own timeouts and is not changed here. If it is shorter than 300 s it still cuts a long call; that is checked on the server.
- After the sync PRs merge and an app deploys, the app's `frontend/nginx.conf` changes.

## Verification

- `node --test scripts/test/docker.test.mjs`: passes. Full `npm test` on macOS: 5 unrelated failures (shell differences) as on main; CI on Linux decides.
- Other `npm run check` steps pass.
