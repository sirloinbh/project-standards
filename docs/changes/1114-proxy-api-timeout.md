# #1114 Let an app set the shared proxy's /api/ timeout, 300 s for study-log

- Issue: [#1114](https://github.com/sirloinbh/project-standards/issues/1114) (epic #406)
- Branch: `feat/1114-proxy-api-timeout`
- Follow-up of #1011 and sirloinbh/study-log#268

## Change

| File | Content |
|---|---|
| `registry/projects.schema.json` | Optional `service.apiTimeoutSec` (integer 60 to 600) |
| `registry/projects.json` | study-log sets 300 |
| `scripts/lib/proxy.mjs` | An app with the value gets `location /api/` in its server block with `proxy_read_timeout` and `proxy_send_timeout`; the proxy headers are shared with `location /` |
| `scripts/test/proxy.test.mjs` | study-log's `/api/` has 300 s and the headers; no other app and no other path has a timeout line |
| `docs/server-proxy.md` | What is generated, and the Limits note |

## Notes

- Why: the shared host proxy set no timeout, so nginx's 60 s default applied in front of the app's own 300 s (#1011). A Claude call that takes longer than 60 s failed on the server.
- Why a registry value and not 300 s for everyone: only study-log has long API calls. `service.apiBodyMb` (#589) is the same kind of per-app value.
- A `location /api/` does not inherit the headers of `location /`, so both use one `proxyHeaders` helper; the test checks the headers are present.
- Nothing changes on the server until the regenerated `nginx/apps.conf` is copied and nginx is reloaded (docs/server-proxy.md, "Changes later").

## Verification

See the PR.
