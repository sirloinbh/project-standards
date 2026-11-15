# #549 Register the shared sign-in service

## Change

| File | Content |
|---|---|
| `registry/projects.json`, `registry/projects.schema.json` | New list `sharedServices` (ADR-0015): `shared-auth`, slot 10, repo `shared-auth`, subdomain `auth`, ports web 8110, api 3110, db 15410 |
| `scripts/lib/registry.mjs` | Shared services share the slot, name, and port checks with apps and local tools, and their subdomain must not collide with an app's. A reserved subdomain such as `auth` is allowed only here |
| `tools/app-secrets.mjs` | `set` accepts `/sirloinbh/<shared service>/<name>`, so the user can store the sign-in keys (#549 step 4) |
| `scripts/gen-docs.mjs`, `docs/projects.md` | "Shared services" table |
| Tests | `registry.test.mjs`, `app-secrets.test.mjs` |

A separate list keeps the service out of everything that means "the 8 apps": sync targets, the proxy, compliance, and the app template checks. #550 adds it to those as each part is built.

## Verification

- `npm run check`: recorded in the PR body
