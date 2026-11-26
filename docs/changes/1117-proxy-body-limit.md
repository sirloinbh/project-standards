# #1117 Pass the app's /api/ body limit through the shared host proxy

- Issue: [#1117](https://github.com/sirloinbh/project-standards/issues/1117) (epic #406)
- Branch: `feat/1117-proxy-body-limit`
- Follows #589 (app nginx body limit) and #1114 (proxy timeout)

## Change

| File | Content |
|---|---|
| `scripts/lib/proxy.mjs` | `proxyApps` carries `service.apiBodyMb`; an app with it gets `client_max_body_size <n>m;` in its `location /api/` on the host proxy (the block is also made for an app with only a timeout) |
| `scripts/test/proxy.test.mjs` | study-log's `/api/` has `client_max_body_size 21m;`; apps with neither value get no `/api/` block |
| `docs/server-proxy.md` | What is generated, and the Limits note |

## Notes

- Why: the host proxy had no `client_max_body_size`, so nginx's 1 MB default answered 413 to a study-log upload (limit 21 MB) before the app's own nginx or API saw it.
- No new registry field: the existing `service.apiBodyMb` is used. Only study-log sets it today.
- Nothing changes on the server until the regenerated `nginx/apps.conf` is copied and nginx is reloaded.

## Verification

See the PR.
