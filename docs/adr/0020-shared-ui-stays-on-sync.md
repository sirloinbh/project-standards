# 0020. Shared UI stays on sync PRs; no shadcn registry for now

- Status: Accepted; moved to design-system as [ADR-0004](https://github.com/sirloinbh/design-system/blob/main/docs/adr/0004-shared-ui-stays-on-sync.md) (#1167, still the text of record there) (issue #562, parent #546); partly superseded by [ADR-0031](0031-design-system-repository.md) (the source of the shared UI moves to its own repository; delivery by sync PRs stays)
- Date: 2026-11-17
- Builds on: [ADR-0007](0007-shadcn-ui-icons-emoji.md) (shadcn/ui sources kept in the repo, no `npx shadcn`) and design.md 4.4 (hash-checked managed files).

## Context

- Shared UI lives in `templates/ui/` and reaches the 8 apps as centrally managed files through sync PRs. Each file's hash is checked in CI, so an app cannot drift without a failing check.
- shadcn CLI v4 (March 2026) can install a design system from a registry (`registry:base`: style, colors, icons, dependencies, fonts) and a public GitHub repo can serve as a registry. `shadcn add <item> --diff` and `--dry-run` preview changes; there is no separate update command, and `--overwrite` re-pulls an item ([changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4), [CLI docs](https://ui.shadcn.com/docs/cli)).

## Comparison

| | Sync PRs (now) | shadcn registry |
|---|---|---|
| Install | Sync PR on rollout; scaffold copies it | `npx shadcn add` per app (runs a downloaded package) |
| Update | Central merge opens a reviewed PR in every app, with rendered per-app values (registry data such as `DARK_ONLY`, `apps.ts`) | Each app re-runs `add --overwrite` by hand; nothing opens a PR |
| Drift detection | Hash check in CI fails on any local edit; the compliance report lists it | Only `add --diff` on demand; no enforcement |
| Per-app values | Template variables from `registry/projects.json` | Registry items are static files; per-app values need extra steps |
| Non-UI files (workflows, agent instructions, tests) | Same mechanism | Not what a registry is for |
| Supply chain | No download at install time | Needs `npx`, which ADR-0007 and the dependency policy forbid without the user's reconfirmation |

## Decision

1. Keep distributing shared UI, the app shell, and the app switcher through sync PRs. The registry would add a second path that still needs sync for the per-app values and drift checks.
2. Do not adopt a shadcn registry now. This keeps ADR-0007 (no `npx shadcn`).
3. Keep `@sirloinbh/design-tokens` as an npm package, and no `packages/ui` monorepo (each app has its own repo).

## Revisit when

- A new app type needs many shadcn components the central repo does not carry. Then consider a registry only as a source for hand-reviewed imports into `templates/ui/`, which still ships by sync. Running the CLI needs the user's confirmation.

## Consequences

- No code change. `docs/ui-components.md` links here.
