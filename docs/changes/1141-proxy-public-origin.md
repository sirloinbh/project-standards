# #1141 Serve an opt-in public origin port on the shared host proxy

- Issue: [#1141](https://github.com/sirloinbh/project-standards/issues/1141) (epic #406)
- Branch: `feat/1141-proxy-public-origin`
- Needed by money-ledger#314 (Kakao skill webhook). The firewall side (TCP 8443 open to everyone) is in shared-aws-infrastructure#118 and #129.

## Change

| File | Content |
|---|---|
| `registry/projects.schema.json` | New optional `service.publicOrigin { port (1025-65535), path (starts with /), method (GET, POST, PUT, PATCH, DELETE) }` |
| `registry/projects.json` | money-ledger: `{ "port": 8443, "path": "/kakao/skill", "method": "POST" }` |
| `scripts/lib/proxy.mjs` | For each app with the field: a `listen <port> ssl` server for the app host with `location = <path>` (`limit_except <method> { deny all; }`, `client_max_body_size 16k`, proxy to `127.0.0.1:<ports.api>`) and `location / { return 404; }`; once per port a `default_server` with `ssl_reject_handshake on`. A port that is already a registry port, or used by two apps, is refused |
| `scripts/test/proxy.test.mjs` | The money-ledger block, the reject server, no change without the field, and the refusals |
| `docs/server-proxy.md` | What is generated, the firewall exception, and the rollout |

## Notes

- The port is open to everyone at the firewall, so the block passes only the one path and method and goes straight to the API port. The app publishes its API on `127.0.0.1:<ports.api>` only (money-ledger#314), so its web nginx (a managed template) is not involved.
- Apps without the field get the same config as before.
- Nothing changes on the server until the regenerated `nginx/apps.conf` is copied and nginx is reloaded (`docs/server-proxy.md`, "Changes later").

## Verification

See the PR.
