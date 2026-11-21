# #961 Name the utility sync targets in AGENTS.md

Wording only (user request, 2026-11-21). Since #946 `develop-skill` and `file-control` are sync targets with the `utility` profile ([ADR-0029](../adr/0029-standards-delivery-per-repo-group.md)), but `AGENTS.md` still listed only the 8 apps, the infrastructure repo, and the two shared services.

## Change

| File | Content |
|---|---|
| `AGENTS.md` | The intro sentence and the "Current phase" bullet name the two utilities, their profile, and link ADR-0029. No rule changed |

## Checks

- `npm run check:docs`: passed.
