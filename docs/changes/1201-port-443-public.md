# #1201 Port 443 is public: proxy comment and docs

- Issue: [#1201](https://github.com/sirloinbh/project-standards/issues/1201)
- Branch: `docs/1201-port-443-public`

## Changes — 2026-11-28

- `scripts/lib/proxy.mjs`: the `apps.conf` header comment now says 443 is open to everyone (shared-aws-infrastructure#132) and every app must register auth before its `/api` routes.
- `docs/server-proxy.md`: access note rewritten; new "Adding an app to the proxy" checklist (an app without auth must not be added).
- ADR-0012 and ADR-0015: dated update notes for the 443 access rule. `docs/runbooks/deploy.md`: access sentences match.

## Verification

- `npm run check`: see the PR.
