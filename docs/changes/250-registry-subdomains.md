# #250 Fill the registry subdomains and check them

## Change

| File | Content |
|---|---|
| `registry/projects.json` | `service.subdomain` of the 8 apps is the app `name` (ADR-0012) |
| `registry/projects.schema.json` | `service.subdomain` is a required single DNS label (no `null`). `service.domain` is described as the parent domain; `null` uses `rootDomain` |
| `scripts/lib/registry.mjs` | `serviceHost()` builds `<subdomain>.<service.domain or rootDomain>`. New checks: duplicate subdomain, subdomain equal to `name`, reserved names (`www`, `api`, `app`, `admin`, mail and DNS names, and others) |
| `scripts/gen-docs.mjs` | The "Service address" column uses `serviceHost()` |
| `scripts/test/registry.test.mjs` | Duplicate subdomain and address, name rule, reserved names, and DNS label format |
| `docs/design.md` | Registry rules for `service` |

## Decisions

- `service.domain` stays `null` for every app and means "use `rootDomain`". It is kept so one app could later live under another domain.
- `rootDomain` stays `null` until the domain is bought (#249). Filling it is split into #539, so `docs/projects.md` still shows "TBD" for the addresses.

## Verification

- `node --test scripts/test/registry.test.mjs`: 18 passed
- `npm run check`: recorded in the PR body
